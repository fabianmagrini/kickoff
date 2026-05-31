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
3. Import the server function in the relevant route — one import, one call.

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

### Cross-feature dependencies
Repositories may depend on other repositories (e.g. `insightsRepository` calls `matchesRepository.getById`). Server functions must not call other server functions.

## Database Schema

- `matches` — fixtures (48 teams, 12 groups A–L, plus knockout rounds)
- `user` — Better Auth users + aggregated `points`
- `tips` — user score predictions per match
- `ai_match_insights` — cached LLM analysis per match

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
npm run build          # Production build
npm run start          # Start production server
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
    auth.client.ts                   # createAuthClient() for React hooks
  db/
    index.ts                         # Drizzle client (neon-http driver)
    schema.ts                        # All table definitions
  features/
    matches/
      matches.repository.ts          # DEEP: getAll(), getById()
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
  routes/
    __root.tsx                       # Root layout + Navbar with auth state (profile link)
    index.tsx                        # Dashboard (upcoming matches, recent tips, stats)
    login.tsx                        # Sign in / Sign up combined page
    profile.tsx                      # Authenticated user profile + full tip history
    leaderboard.tsx                  # Top 50 users by points
    matches/
      index.tsx                      # Fixture list
      $matchId.tsx                   # Match detail + tip form + AI co-pilot
    api/
      auth/$.ts                      # Better Auth catch-all
      cron/score.ts                  # POST /api/cron/score — secured scoring trigger
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

### Documentation
Document the *why*, not the *what*:

- **CLAUDE.md** — update the Project Structure tree and the "Not Yet Implemented" list when features are added or completed.
- **Code comments** — only when the reason behind a decision is non-obvious (a workaround, a hidden constraint, a schema quirk). Do not describe what the code does; well-named identifiers do that.
- **Server function modules** — add a one-line JSDoc on exported server functions that have auth requirements or non-obvious side effects.

## Backlog

See [backlog.md](./backlog.md) for the full prioritised list of outstanding features, testing gaps, and infrastructure work.
