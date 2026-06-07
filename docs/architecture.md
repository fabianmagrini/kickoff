# Kickoff — Architectural Overview

> Reverse-engineered deep dive: how the system was built, why decisions were made, and how the pieces fit together.

---

## 1. Executive Summary

Kickoff is a **production-grade sports tipping application** that supports multiple competitions — the FIFA World Cup 2026 was the first, but any competition (UEFA Euro, Copa América, AFL, etc.) can be added by seeding a `competitions` row and fixtures. Users predict match scores; per-competition points accumulate on live leaderboards. An AI co-pilot generates LLM-powered pre-match analysis on demand.

The architecture is a **modular monolith with SSR** built on TanStack Start. There is no separate API server — the same Node.js process serves HTML, handles server functions (RPC), and talks to the database. The team deliberately chose a tight vertical stack: Neon serverless Postgres, Drizzle ORM, Better Auth, TanStack Router + Query, Vercel AI SDK, all wired together in one repo with one build artifact.

Engineering maturity is high for a solo/small-team project: consistent layering, good test coverage, typed end-to-end, ADRs for decisions, GitHub Actions CI on every PR.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│  React 19  •  TanStack Router  •  TanStack Query  •  Tailwind  │
│  authClient.useSession()  •  useMutation (optimistic)           │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP  (SSR HTML  +  _serverFn RPC)
┌────────────────────────▼────────────────────────────────────────┐
│                   Node.js / Vinxi Server                        │
│  TanStack Start  •  Streaming SSR  •  createServerFn handlers   │
│  Better Auth session validation  •  Admin guard (ADMIN_USER_IDS)│
│  Vercel AI SDK  •  generateObject()  •  zod schema validation   │
└────────────────────────┬────────────────────────────────────────┘
                         │  neon-http  (HTTP/2 Postgres wire)
┌────────────────────────▼────────────────────────────────────────┐
│              Neon Serverless Postgres                           │
│  competitions  •  matches  •  user_competition_points           │
│  user/session/account/verification (Better Auth)               │
│  tips  •  leagues  •  league_members  •  ai_match_insights      │
│  admin_audit_log                                                │
└─────────────────────────────────────────────────────────────────┘
         ↑ also queried by  scheduled POST /api/cron/score
         ↑ also written by  AI SDK (insight cache)
         ↑ also seeded by   scripts/seed-dev.ts
```

**Architectural style:** Hybrid SSR + SPA (modular monolith). The server renders the initial HTML shell with data serialised into it; subsequent navigations are client-side SPA transitions without full reloads. Auth-triggered navigations (`window.location.href`) force a full reload to give SSR access to the session cookie.

---

## 3. Runtime Request Lifecycle

### First page load — `/matches/abc-123`

```
Browser GET /matches/abc-123
  │
  ▼ Vinxi server (Node.js)
  TanStack Start SSR handler
    │
    ├─ Route loader runs server-side:
    │    queryClient.ensureQueryData(matchQueryOptions('abc-123'))
    │      → matchesRepository.getById('abc-123')    [DB query via neon-http]
    │    queryClient.ensureQueryData(insightQueryOptions('abc-123'))
    │      → insightsRepository.getCached('abc-123') [DB query]
    │    queryClient.ensureQueryData(userTipQueryOptions('abc-123'))
    │      → auth.api.getSession({ headers })         [session lookup]
    │      → tipsRepository.getUserTip(userId, matchId)
    │
    ├─ React renders component tree to HTML stream
    │    QueryClient state serialised into __QUERY_CLIENT_STATE__ window var
    │
    └─ HTML + inline state + JS bundle references sent to browser

Browser receives HTML — page is immediately readable (no loading spinners)
  │
  ▼ Client hydration  (entry-client.tsx)
  hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)
    │
    └─ TanStack Query rehydrates from __QUERY_CLIENT_STATE__
       No network requests needed — data already in cache
```

### Subsequent SPA navigation — clicking another match link

```
User clicks /matches/xyz-456
  │
  ▼ TanStack Router intercepts (client-side)
  Route loader runs CLIENT-side:
    queryClient.ensureQueryData(matchQueryOptions('xyz-456'))
      → if stale: POST /_serverFn/getMatchByIdFn → server → DB → JSON
      → if fresh: served from QueryClient cache immediately

  React updates component tree — no full page reload
```

### Tip submission

```
User fills score inputs, clicks "Lock in Tip"
  │
  ▼ TipForm useMutation.onMutate()
  Optimistic update:
    queryClient.setQueryData(userTipKey, { tip: { predictedHomeScore: 2, ... } })
    Component immediately re-renders showing "Your tip: 2 – 1"
  │
  ▼ POST /_serverFn/submitTipFn
  Server:
    auth.api.getSession() → validate user
    matchesRepository.getById() → check status !== 'completed'
    tipsRepository.submit() → INSERT into tips table
    returns { tipId }
  │
  ▼ onSettled: queryClient.invalidateQueries(userTipKey)
  Refetch confirms server state; tip remains locked
  onError: rolls back optimistic state, shows error
```

---

## 4. Tech Stack

### Frontend

| Technology | Purpose | Why chosen | Tradeoffs | Alternatives |
|---|---|---|---|---|
| **React 19** | UI component model | Ecosystem, concurrent features | Learning curve, bundle size | Solid.js, Svelte |
| **TanStack Router** | File-based routing with full TypeScript | Type-safe routes, SSR loaders, preloading | Newer, smaller community than Next.js | Next.js App Router, Remix |
| **TanStack Start** | SSR framework on top of TanStack Router | Keeps same mental model as client router, Vinxi-powered | Very new (v1.x), some rough edges | Next.js, Remix, Nuxt |
| **TanStack Query** | Server-state cache | Normalised cache, stale-while-revalidate, optimistic updates | Adds complexity vs. simple fetch | SWR, Jotai + fetch |
| **Tailwind CSS 3** | Styling | Utility-first, no CSS-in-JS overhead | Verbose JSX, no design tokens out of box | CSS Modules, vanilla-extract |

### Backend / Runtime

| Technology | Purpose | Why chosen | Tradeoffs |
|---|---|---|---|
| **Vinxi** | Meta-framework runtime | Powers TanStack Start; unified client + server build | Very new, limited production case studies |
| **`createServerFn`** | RPC from client to server | Type-safe, no REST boilerplate, co-located with feature | Non-standard; harder to expose as a public API |
| **Better Auth** | Session-based auth | Self-hosted, drizzle adapter, no vendor lock-in | You handle infra vs. Clerk/Auth0 |
| **Zod v4** | Runtime validation in server fns | Pairs with TypeScript; clear error messages | Bundle weight (v4 is leaner than v3) |

### Data

| Technology | Purpose | Why chosen | Tradeoffs |
|---|---|---|---|
| **Neon Serverless Postgres** | Primary database | HTTP driver works in edge/serverless | Latency on cold start; HTTP slower than binary protocol |
| **Drizzle ORM** | Type-safe query builder | Thin layer, migrations, no magic, 1:1 with SQL | Less battle-tested than Prisma |
| **`neon-http` driver** | Postgres-over-HTTP | Works in Vercel Edge, Cloudflare Workers | No streaming, cursors, or long transactions |

### AI

| Technology | Purpose | Why chosen |
|---|---|---|
| **Vercel AI SDK (`ai`)** | LLM client abstraction | Provider-agnostic: swap Google ↔ OpenAI via env var; `generateObject` gives structured output |
| **`@ai-sdk/google` + `@ai-sdk/openai`** | Provider SDKs | Both plugged in; default is Gemini Flash (fast + cheap) |
| **DB-cached insights** | Avoid repeat LLM calls | `ai_match_insights` stores response; `getOrGenerate` is cache-first |

### Tooling

| Technology | Purpose |
|---|---|
| **Vite 8 + Rolldown** | Bundler — Rolldown (Rust-based) replaces Rollup inside Vite 8 for faster builds |
| **Vitest 3** | Unit tests — same config as Vite, no Jest transform setup needed |
| **Playwright** | E2E tests — browser automation, `globalSetup` for DB seeding |
| **happy-dom** | Lightweight JSDOM alternative for Vitest |
| **tsx** | TypeScript execution for seed scripts without a compile step |
| **drizzle-kit** | Schema migrations and Drizzle Studio UI |

---

## 5. Repository Structure

> The authoritative file-by-file listing is in [CLAUDE.md — Project Structure](../../CLAUDE.md). It is updated with every feature; this section explains the *why*, not the *what*.

The codebase uses **vertical slice architecture**: one folder per domain concept under `src/features/`, each owning its full stack from DB query to server function to query options. Routes are a thin view layer — no DB imports, no business logic.

This mirrors the **Deep Module** pattern from *A Philosophy of Software Design* (Ousterhout): modules expose a small interface (`getOrGenerate(matchId)`) that hides large implementation complexity (cache lookup → DB fetch → LLM call → DB write).

Three structural invariants that constrain all new code:
- `*.repository.ts` — the only files that may import `db` and the schema.
- `*.server.ts` — the only files that perform auth checks; wraps repository methods as `createServerFn`.
- `routes/` — calls server functions and renders data; no DB imports, no business logic.

---

## 6. Frontend Architecture

### Routing

TanStack Router uses file-based routing. `routeTree.gen.ts` is auto-generated by the Vite plugin — never edited by hand. The route tree is fully typed: `<Link to="/matches/$matchId">` is a compile error if the route doesn't exist.

> The current route hierarchy is maintained in [CLAUDE.md — Project Structure](../../CLAUDE.md) under `routes/`. Keeping it there avoids duplicating the same listing in two files.

### Rendering Strategy

**SSR + Client Hydration hybrid.** Every route has a `loader` that pre-fetches data into the QueryClient on the server. The serialised cache is embedded in the HTML response. On the client, `hydrateRoot` picks up the existing DOM without re-fetching. Subsequent navigations are SPA (loader runs client-side against server functions).

Key invariant: **loaders must `return` the result of `ensureQueryData`**. A void loader populates the server-side QueryClient but that state is never serialised to the client — the client starts with an empty cache and triggers a second fetch. This is documented in CLAUDE.md.

### Data Fetching

```
Route Loader (server-side on first load, client-side on navigation)
  └── queryClient.ensureQueryData(featureQueryOptions)
        └── featureQueryFn → createServerFn → repository → DB

Component
  └── Route.useLoaderData()          ← synchronous, from cache
  └── useQuery({ initialData })      ← reactive, refetches when stale
  └── useMutation → server fn → DB  ← with optimistic updates
```

### Optimistic Updates

`TipForm` is the canonical example:

1. `onMutate`: snapshot previous state, write optimistic tip to cache → instant UI update
2. `mutationFn`: POST to server fn
3. `onError`: restore snapshot (rollback)
4. `onSettled`: `invalidateQueries` → refetch to confirm server state

### Auth Flow

```
Unauthenticated user → /login
  → fills form → authClient.signIn.email()
  → window.location.href = '/'    ← full reload (not navigate())
  → SSR picks up session cookie
  → HTML arrives with session baked in
  → Navbar shows user name from first paint — no flash
```

`window.location.href` is used instead of TanStack Router's `navigate()` because `useSession()` is a client-side reactive hook. After a SPA navigation it has stale `null` state and takes ~1s to refetch. A full reload lets SSR read the cookie and serve the correct state immediately.

---

## 7. Backend Architecture

### API Design: Server Functions (RPC, not REST)

There are no REST routes. Every data operation is a `createServerFn` call. The client-side stub calls `POST /_serverFn/<fnName>` with a JSON body; the server runs the handler and returns JSON.

```typescript
export const getMatchesFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(({ data: competitionId }) => matchesRepository.getAll(competitionId));
```

Trade-off: you gain type safety end-to-end and zero boilerplate; you lose the ability to call these from a mobile client or external service without using the same framework.

### Layering

```
Route loader / component
  └── server fn  (auth check + input validation with Zod)
        └── repository  (SQL queries / LLM calls)
              └── db client  (neon-http → Neon Postgres)
```

Auth checks live exclusively in the server fn layer. Repositories are pure data functions — easily unit-tested by mocking the DB client.

### Scoring Pipeline

```
calculatePoints()               → pure function, no I/O
tipsRepository.submit()         → INSERT only
scoreCompletedMatches(chunkSize=10)
                                → fetch completed matches
                                → for each (up to chunkSize with unscored tips):
                                    calculatePoints() → UPDATE tip (scoredAt)
                                    recalculate user.points (global SUM across all tips)
                                    upsert user_competition_points (per-competition SUM)
                                → returns { tipsScored, matchesProcessed, remaining }
adminRepository.updateMatch()   → SELECT current state → INSERT audit log row
                                → UPDATE match score/status
                                → loop scoreCompletedMatches() until remaining === 0
POST /api/cron/score            → validate x-cron-secret header
                                → loop scoreCompletedMatches() until remaining === 0
```

`scoreCompletedMatches()` is **idempotent** — tips with `scoredAt IS NOT NULL` are skipped. The `chunkSize` limit keeps each DB round-trip within Neon's HTTP timeout; callers loop until `remaining === 0` to exhaust the full backlog.

### AI Integration

```
insightsRepository.getOrGenerate(matchId):
  1. Promise.all([
       SELECT FROM ai_match_insights WHERE match_id = $1,   ← cache lookup
       matchesRepository.getById(matchId)                   ← match fetch
     ])                                                      (parallel, always)
  2. if match not found → throw 'Match not found'
  3. if cached AND NOT stale AND match is completed → return cached (0 LLM calls)
     staleness: generatedAt < matchDate − 24h  (refreshed within 24h of kickoff)
  4. else (cache miss OR stale scheduled match):
       generateObject({ model, schema, prompt })             ← Vercel AI SDK
       INSERT ... ON CONFLICT (match_id) DO UPDATE SET ...   ← upsert (safe on re-generate)
       return saved
```

`generateObject` enforces a Zod schema on the LLM response — if the model returns malformed JSON or violates the schema, Vercel AI SDK retries automatically. The `AI_PROVIDER` env var selects Google Gemini (default) or OpenAI; `AI_MODEL` overrides the model ID. The match fetch and cache lookup run in parallel on every call; this makes the staleness check available without a second round-trip when the cached row is stale.

---

## 8. Infrastructure

### Local Development

```bash
npm run dev       # Vite + Vinxi: SSR + HMR in one process on port 5173
                  # strictPort: true — fails fast if port is taken
npm run db:push   # push schema changes to Neon (dev)
npm run db:seed:dev  # seed 72 group stage fixtures
```

No Docker required — Neon is always remote. The `--env-file=.env` flag on seed scripts loads env vars without a dotenv library.

### Build

```bash
npm run build    # Rolldown bundles client (dist/client/) + server (dist/server/)
npm run start    # node .output/server/index.mjs
```

### Secrets

All secrets live in `.env` (gitignored):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Session signing key |
| `BETTER_AUTH_URL` | Must match the dev server port (5173) |
| `CRON_SECRET` | Validates `x-cron-secret` header on scoring endpoint |
| `ADMIN_USER_IDS` | Comma-separated user IDs for admin access |
| `AI_PROVIDER` / `AI_MODEL` | LLM provider selection |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key (if `AI_PROVIDER=openai`) |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth (optional) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth (optional) |

### CI/CD

`.github/workflows/ci.yml` runs `npm run test` (Vitest unit tests) and `npm run build` on every PR and push to `main`. No secrets required — unit tests mock the DB and the build uses an existing Neon fallback URL. E2E tests are excluded until a preview deployment is available.

---

## 9. Engineering Quality Assessment

| Dimension | Assessment |
|---|---|
| **Architectural consistency** | Deep module pattern applied uniformly across all 10 feature slices |
| **Type safety** | End-to-end: DB schema → server fn → client; no visible `any` |
| **Test coverage** | 82 unit tests across all repositories; E2E suite covers all routes including competition-scoped fixtures, leaderboard, leagues, admin, profile, cron |
| **Developer experience** | One-command dev, co-located tests, CLAUDE.md documents the why |
| **Observability** | Pino structured logging on all server functions (error + slow-call detection); no error tracking service, no metrics |
| **CI/CD** | GitHub Actions: unit tests + build on every PR and push to main; E2E not yet on CI |
| **Security** | Sessions correct, cron secret, admin guard, AI co-pilot rate-limited (60s per user per match); no CSP headers |
| **Scalability** | Neon HTTP is serverless-friendly; scoring chunked (10 matches/call) with loop-until-done |
| **Operational maturity** | `GET /api/healthz` readiness endpoint; no graceful shutdown, no alerting |

**Strengths:**
- Layering is rigorous and never violated (no DB imports in routes, no business logic in routes)
- Optimistic updates implemented correctly with rollback
- `globalSetup` DB seeding pattern for E2E is clean and portable
- ADRs document *why* decisions were made, not just what

**Risks:**
- `ADMIN_USER_IDS` as a comma-separated env var is fragile at scale
- AI co-pilot rate limit is in-process memory — resets on restart and does not enforce across replicas
- No graceful shutdown — in-flight requests can be interrupted on deploy

---

## 10. Historical Evolution

Based on git history and ADRs, the likely build order:

```
Phase 1 — Scaffolding
  Vinxi + TanStack Router + Drizzle schema + Better Auth
  Basic matches list + match detail

Phase 2 — Core Feature
  Tip submission with optimistic updates
  Scoring logic (calculatePoints + scoreCompletedMatches)
  Cron endpoint secured with CRON_SECRET

Phase 3 — AI Feature
  Vercel AI SDK integration
  insightsRepository with DB cache
  AI co-pilot UI on match detail

Phase 4 — Social Features
  Leaderboard, Profile, Dashboard

Phase 5 — Quality Pass
  Unit tests for all repositories
  E2E tests (home, login, matches, profile, tip-form)
  ADRs written retrospectively

Phase 6 — Hardening
  Fix auth session cookie (server.handlers.ANY pattern)
  Build fix (auth.client → authClient rename)
  Navbar flash fix (window.location.href)
  Admin UI (ADMIN_USER_IDS gate)
  Playwright globalSetup for DB seeding
  Port pinned with strictPort

Phase 7 — Social + Backlog
  Private Leagues (invite-code groups with scoped leaderboard)
  Full E2E coverage for all routes
  Testing gaps closed; ADRs written retrospectively

Phase 8 — Multi-Competition
  competitions + user_competition_points schema tables
  All repositories scoped to competitionId
  /competitions/$id/* route tree; home page → competition selector
  One-time migration script for existing WC 2026 data

Phase 9 — Infrastructure Hardening
  GitHub Actions CI (unit tests + build on every PR)
  Pino structured logging on all server functions (reqId, slow-call detection)
  AI Co-Pilot rate limit: auth required + 60s per-user per-match cooldown
  scoreCompletedMatches() chunked (chunkSize=10, remaining counter, cron loop)
  Insight TTL: staleness check (generatedAt < matchDate−24h), upsert on regenerate
  GET /api/healthz readiness endpoint
  admin_audit_log table: every score change records who/what/when
  Code review: 8 correctness fixes (TOCTOU guard, scoring loop, upsert PK fix, chunk guard)
```

---

## 11. Key Lessons

**1. Server functions as the API layer**
`createServerFn` eliminates REST ceremony (no URL design, no controller, no serialisation boilerplate). The trade-off is coupling: the client must use the same framework. This is a good trade for a single-team monolith; it breaks down if you need a public API or mobile clients.

**2. Deep modules hide complexity from callers**
`insightsRepository.getOrGenerate(matchId)` is a single call for the caller. Behind it: a DB read, a conditional LLM call, structured output validation, and a DB write. This is the correct abstraction boundary — the caller never needs to know whether the answer came from cache or the LLM.

**3. Loaders must return data**
`await queryClient.ensureQueryData(...)` with no `return` populates the server-side QueryClient, but that state is never serialised to the client. The client starts with an empty cache and triggers a second fetch. This class of bug is invisible without understanding the SSR hydration model.

**4. Optimistic updates require a rollback strategy**
The `TipForm` mutation shows the full pattern: snapshot → optimistic write → server call → rollback on error → invalidate on settle. Skipping rollback leaves the UI in a permanently wrong state after a server error.

**5. Filename conventions are architecture**
Renaming `auth.client.ts` to `authClient.ts` fixed the production build. The `.client.` naming tells TanStack Start's bundler "this file is browser-only." When that convention is applied to an isomorphic module, it creates a false constraint the bundler enforces at build time.

---

## 12. Shipped Improvements

All items from the original backlog have shipped as of 2026-06-08. See [docs/completed.md](./completed.md) for the full history with commit SHAs.

The remaining open risks are listed in §9: in-process rate-limit state (no cross-replica enforcement) and lack of graceful shutdown handling.

---

## 13. Component Interaction Map

```mermaid
graph TD
    Browser -->|SSR HTML| Vinxi
    Browser -->|POST /_serverFn/*| ServerFns
    Browser -->|GET /api/auth/*| BetterAuth

    Vinxi --> ServerFns
    Vinxi --> BetterAuth

    ServerFns --> competitionsRepo[competitions.repository]
    ServerFns --> matchesRepo[matches.repository]
    ServerFns --> tipsRepo[tips.repository]
    ServerFns --> insightsRepo[insights.repository]
    ServerFns --> leaderboardRepo[leaderboard.repository]
    ServerFns --> leaguesRepo[leagues.repository]
    ServerFns --> dashboardRepo[dashboard.repository]
    ServerFns --> profileRepo[profile.repository]
    ServerFns --> adminRepo[admin.repository]
    ServerFns --> scoringService[scoring.service]

    adminRepo --> scoringService
    insightsRepo -->|generateObject| VercelAI[Vercel AI SDK]
    VercelAI -->|API call| LLM[Google Gemini / OpenAI]

    competitionsRepo --> DB[(Neon Postgres)]
    matchesRepo --> DB
    tipsRepo --> DB
    insightsRepo --> DB
    leaderboardRepo --> DB
    leaguesRepo --> DB
    dashboardRepo --> DB
    profileRepo --> DB
    adminRepo --> DB
    scoringService --> DB
    BetterAuth --> DB

    CronJob[External Cron] -->|POST /api/cron/score\nx-cron-secret header| scoringService
```

---

## Glossary

| Term | Definition |
|---|---|
| **Server Function** | `createServerFn` — runs server-side but called from client code; TanStack Start generates the HTTP stub automatically |
| **Deep Module** | A module with a simple interface hiding complex implementation; the guiding architectural principle of this codebase |
| **Optimistic Update** | Writing the expected result to the client cache immediately, before the server confirms, to give instant UI feedback |
| **Hydration** | Attaching React's event system to server-rendered HTML on the client |
| **staleTime** | TanStack Query setting controlling how long cached data is considered fresh before a background refetch |
| **Vinxi** | The meta-framework runtime TanStack Start builds on; handles bundling both client and server and the SSR request lifecycle |
| **neon-http** | Neon's Postgres driver that sends queries over HTTPS instead of TCP — makes Postgres work in serverless environments |
| **ADR** | Architecture Decision Record — a short document capturing *why* a decision was made, not just what was decided |
| **Vertical Slice** | A feature module that owns its full stack from DB query to UI, rather than grouping by technical layer |
