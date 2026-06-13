# Kickoff — World Cup 2026 Tipping App

A production-grade sports tipping application for FIFA World Cup 2026.

## Tech Stack

- **Framework**: TanStack Start (React 19, SSR, file-based routing, server functions)
- **Auth**: Better Auth with `tanstackStartCookies` plugin
- **Database**: Neon Serverless Postgres via Drizzle ORM
- **State/Cache**: TanStack Query
- **AI**: Vercel AI SDK (`ai` + `@ai-sdk/google` / `@ai-sdk/openai`) with DB caching; provider configurable via `AI_PROVIDER` env var (default: `google`)
- **Styling**: Tailwind CSS

## Architecture: Deep Modules

The codebase is organised around **deep modules** — each feature module exposes a simple interface that hides significant implementation complexity. There are two layers per feature:

- **`*.repository.ts`** — deep module. Owns all DB queries (and LLM calls for insights). Import `db` and schema only here, never in routes.
- **`*.server.ts`** — thin transport. Wraps repository methods as `createServerFn` calls. Auth checks live here, not in repositories.
- **`routes/`** — thin view layer. Calls feature server functions; renders data. No DB imports, no business logic.

### Adding a new feature

1. Create `src/features/<name>/<name>.repository.ts` with a named object exposing async methods.
2. Create `src/features/<name>/<name>.server.ts` wrapping each method as a server function.
3. Create `src/features/<name>/<name>.queries.ts` with `queryOptions` wrapping the server fn.
4. In the relevant route: call `queryClient.ensureQueryData(…QueryOptions)` in the loader (and `return` the result), then read it with `Route.useLoaderData()` or `useQuery({ initialData: loaderData })` in the component.

## Key Patterns

### Server Functions
Use `createServerFn` from `@tanstack/react-start` — never create manual API routes.

```ts
// repository (deep — hides complexity)
export const widgetRepository = {
  getAll: async (): Promise<Widget[]> => db.select().from(widgets),
};

// server fn (thin — transport only)
export const getWidgetsFn = createServerFn({ method: 'GET' })
  .handler(() => widgetRepository.getAll());
```

### Auth
Auth checks belong in the server fn layer, not in repositories.

```ts
import { getRequest } from '@tanstack/react-start/server';

const session = await auth.api.getSession({ headers: getRequest().headers });
if (!session?.user) throw new Error('Unauthorized');
```

### AI Insights — cache-first
`insightsRepository.getOrGenerate(matchId)` hides: cache lookup → match fetch → LLM call → DB write. Callers never see this complexity.

### Route loaders — always return data
Loaders must `return` the result of `ensureQueryData` so TanStack Router serialises it server→client. A void loader body leaves the client QueryClient empty; `getQueryData` then returns `undefined` on first paint.

```ts
// ✓ data reaches the client
loader: ({ context: { queryClient }, params }) =>
  queryClient.ensureQueryData(matchQueryOptions(params.matchId)),

// ✗ cache is populated on server only — client starts empty
loader: async ({ context: { queryClient }, params }) => {
  await queryClient.ensureQueryData(matchQueryOptions(params.matchId));
},
```

### Cross-feature dependencies
Repositories may depend on other repositories (e.g. `insightsRepository` calls `matchesRepository.getById`). Server functions must not call other server functions.

## Database Schema

- `competitions` — named competitions (slug, sport, status, date range)
- `matches` — fixtures scoped to a competition (homeTeam, awayTeam, group, venue, scores, status)
- `user` — Better Auth users + aggregated global `points`
- `tips` — user score predictions per match
- `user_competition_points` — per-competition points tally driving leaderboards (userId + competitionId unique)
- `ai_match_insights` — cached LLM analysis per match
- `admin_audit_log` — record of every admin score change (matchId, userId, prev/new scores, changedAt)
- `leagues` — invite-code-based private groups scoped to a competition
- `league_members` — join table linking users to leagues

## Scoring Rules

- **3 pts** — exact score prediction
- **1 pt** — correct winner/draw, wrong score
- **0 pts** — incorrect outcome

Logic lives in `src/features/tips/scoring.ts` → `calculatePoints(pH, pA, aH, aA)`.

## Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CRON_SECRET`. AI provider key required: `GOOGLE_GENERATIVE_AI_API_KEY` (default) or `OPENAI_API_KEY`. Control the model with `AI_PROVIDER` (`google`|`openai`) and `AI_MODEL`. OAuth vars (`GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`) are optional — omit to disable those providers.

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Production build → .output/ (node-server) or .vercel/output/ (on Vercel)
npm run start          # Start production server (node .output/server/index.mjs)
npm run test           # Run unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:e2e       # Run E2E tests (Playwright, requires dev server)
npm run test:e2e:ui    # Playwright UI mode
npm run db:push        # Push schema to DB (development)
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio
npm run db:seed:dev    # Seed 72 group stage fixtures (dev — no API key needed)
npm run db:seed        # Seed fixtures from API-Football (requires API_FOOTBALL_KEY)
```

## Project Structure

```
src/
  ai/
    index.ts                         # AI model factory (AI_PROVIDER / AI_MODEL env vars)
  auth/
    auth.ts                          # Better Auth config
    authClient.ts                    # createAuthClient() for React hooks (isomorphic — no .client. naming)
  lib/
    logger.ts                        # Pino singleton + logServerFn wrapper (reqId, slow-call >500ms, log levels)
  db/
    index.ts                         # Drizzle client (neon-http driver)
    schema.ts                        # All table definitions
  features/
    matches/
      matches.repository.ts          # DEEP: getAll(), getById()
      matches.repository.test.ts     # unit tests (co-located)
      matches.server.ts              # thin: getMatchesFn, getMatchByIdFn
      matches.queries.ts             # matchQueryOptions, matchesQueryOptions
    tips/
      tips.repository.ts             # DEEP: submit(), getUserTip()
      tips.server.ts                 # thin: submitTipFn, getUserTipFn (+ auth checks)
      tips.queries.ts                # userTipQueryOptions (staleTime: 0)
      scoring.ts                     # DEEP: calculatePoints()
      scoring.test.ts                # unit tests (co-located)
    insights/
      insights.repository.ts         # DEEP: getCached(), getOrGenerate()
      insights.repository.test.ts    # unit tests (co-located)
      insights.server.ts             # thin: getCachedInsightFn, getOrGenerateInsightFn
      insights.queries.ts            # insightQueryOptions
    leaderboard/
      leaderboard.repository.ts      # DEEP: getTopN()
      leaderboard.repository.test.ts # unit tests (co-located)
      leaderboard.server.ts          # thin: getLeaderboardFn
      leaderboard.queries.ts         # leaderboardQueryOptions (refetchInterval: 60s)
    scoring/
      scoring.service.ts             # scoreCompletedMatches() — batch scoring logic
      scoring.service.test.ts        # unit tests (co-located)
    dashboard/
      dashboard.repository.ts        # DEEP: getUpcomingMatches(), getRecentTips(), getUserStats(), get()
      dashboard.repository.test.ts   # unit tests (co-located)
      dashboard.server.ts            # thin: getDashboardFn (auth-aware)
      dashboard.queries.ts           # dashboardQueryOptions (staleTime: 30s)
    profile/
      profile.repository.ts          # DEEP: get() — user info, rank, all tips
      profile.repository.test.ts     # unit tests (co-located)
      profile.server.ts              # thin: getProfileFn (auth-required)
      profile.queries.ts             # profileQueryOptions (staleTime: 30s)
    admin/
      admin.repository.ts            # DEEP: updateMatch() — fetches current, writes audit log, updates score; getAuditLog()
      admin.repository.test.ts       # unit tests (co-located)
      admin.server.ts                # thin: checkIsAdminFn, updateMatchFn, getAuditLogFn (ADMIN_USER_IDS guard)
      admin.queries.ts               # auditLogQueryOptions
    competitions/
      competitions.repository.ts     # DEEP: getAll(), getById(), getBySlug(), getActive()
      competitions.repository.test.ts # unit tests (co-located)
      competitions.server.ts         # thin: getCompetitionsFn, getCompetitionFn, getActiveCompetitionsFn
      competitions.queries.ts        # competitionsQueryOptions, competitionQueryOptions, activeCompetitionsQueryOptions
    leagues/
      leagues.repository.ts          # DEEP: create(), joinByCode(), getMyLeagues(), getById(), getLeaderboard()
      leagues.repository.test.ts     # unit tests (co-located)
      leagues.server.ts              # thin: getMyLeaguesFn, getLeagueFn, createLeagueFn, joinLeagueFn (auth-required)
      leagues.queries.ts             # myLeaguesQueryOptions, leagueQueryOptions, leagueLeaderboardQueryOptions
  routes/
    __root.tsx                       # Root layout + Navbar with auth state (profile link, Competitions link)
    index.tsx                        # Competition selector (redirects to active competition or shows list)
    login.tsx                        # Sign in / Sign up combined page
    profile.tsx                      # Authenticated user profile + full tip history
    admin.tsx                        # Admin match score entry with competition selector (admin-gated)
    competitions/
      index.tsx                      # All competitions list
      $competitionId/
        index.tsx                    # Competition dashboard (upcoming matches, recent tips, stats)
        matches/
          index.tsx                  # Competition fixture list
        leaderboard.tsx              # Competition leaderboard (per-competition points)
        leagues/
          index.tsx                  # My leagues in this competition + create form (auth-gated)
          $leagueId.tsx              # League detail + scoped leaderboard (member-gated)
          join.tsx                   # Join by invite code (auth-gated)
    matches/
      $matchId.tsx                   # Match detail + tip form + AI co-pilot (global — match ID is unique)
    api/
      auth/$.ts                      # Better Auth catch-all
      cron/score.ts                  # POST /api/cron/score — secured scoring trigger
      healthz.ts                     # GET /api/healthz — deployment readiness check
vercel.json                            # Vercel cron schedule (POST /api/cron/score hourly) + maxDuration 300s
  components/
    tip-form.tsx                     # Auth-gated tip submission form (all states)
    route-error.tsx                  # Shared error boundary UI (used by all loader routes)
  styles/
    app.css                          # Tailwind entry
  vite-env.d.ts                      # Vite client type reference (*.css?url etc.)
  test/
    setup.ts                         # Vitest global setup
  router.tsx                         # Router config
  entry-client.tsx                   # Client entry
  entry-server.tsx                   # Server entry
scripts/
  seed-dev.ts                        # 72 group stage fixtures (real 2026 WC draw)
  seed-matches.ts                    # API-Football production fetch script
```

## Testing & Documentation Standards

### Testing
New code must be covered by tests at the appropriate level:

- **Repository methods** — unit test with mocked DB (see `scoring.service.test.ts` for the `selectQueue` pattern). Cover the happy path, the null/empty case, and any error guard.
- **Server functions** — auth checks must be tested: unauthenticated → throws `'Unauthorized'`; authenticated + missing resource → throws, not null.
- **Routes / UI behaviour** — E2E tests in `e2e/`. At minimum: unauthenticated redirect, page heading renders, key interactive states.
- **Scoring / business logic** — unit test every branch in `src/features/tips/scoring.ts` and co-located `*.test.ts` files.

When adding a new feature, add tests before marking the task done. Aim for each file in `src/features/` to have a corresponding `*.test.ts` sibling or an E2E spec that covers its public contract.

When modifying existing code, update or add a test that would fail without the change. Bug fixes must include a regression test that would have caught the bug before the fix.

### Documentation
Document the *why*, not the *what*:

- **CLAUDE.md** — update the Project Structure tree and link to the backlog when features are added or completed.
- **Code comments** — only when the reason behind a decision is non-obvious (a workaround, a hidden constraint, a schema quirk). Do not describe what the code does; well-named identifiers do that.
- **Server function modules** — add a one-line JSDoc on exported server functions that have auth requirements or non-obvious side effects.

### Feature completion checklist
Before marking any feature or backlog item as done, apply these steps in the same commit as the implementation:

**Always:**
1. **`docs/backlog.md`** — remove the item (or replace it with any follow-on work it uncovered) and move it to `docs/completed.md` with the ship date and commit SHA.
2. **CLAUDE.md Project Structure** — add every new file to the tree with a one-line comment.
3. **ADR** — if the decision meets the criteria in `docs/adr/README.md`, write one before closing the item.

**By change type** — update the listed sections of `docs/architecture.md` in the same commit:

| What changed | Sections to update |
|---|---|
| New schema table | §2 DB diagram · §9 quality assessment |
| New feature slice | §13 component interaction map · §9 (feature slice count) |
| New or retired routes | No update needed — §6 references CLAUDE.md |
| Scoring or data pipeline change | §7 backend architecture |
| Quality gap closed | §9 quality assessment |
| Significant new build phase | §10 historical evolution |
| New architectural decision | §11 key lessons (if a lesson generalises) |

### Architecture Decision Records
Write an ADR in `docs/adr/` whenever a decision meets any of these criteria:

- A library or framework was chosen over meaningful alternatives
- An architectural pattern was adopted that constrains how future code must be written
- A workaround was introduced for a third-party limitation (the *why* would otherwise only live in a commit message)
- A previously accepted decision is being reversed or superseded

**Process:**
1. Copy the template from `docs/adr/README.md` into `docs/adr/NNNN-short-title.md`.
2. Fill in Context (what problem led here), Decision (what was chosen and why), and Consequences (trade-offs accepted).
3. Add a row to the index table in `docs/adr/README.md`.
4. If the ADR supersedes an existing one, update the old ADR's status line.

An ADR does not need to be long. Two or three sentences per section is enough if the reasoning is clear. The goal is to make the *why* recoverable without reading git history.

## Backlog

See [docs/backlog.md](./docs/backlog.md) for the prioritised list of outstanding infrastructure and hardening work (all features are shipped). Completed items are archived in [docs/completed.md](./docs/completed.md).

Significant architecture decisions are recorded as ADRs in [docs/adr/](./docs/adr/).
