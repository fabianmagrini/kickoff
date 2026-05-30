# Kickoff

FIFA World Cup 2026 tipping competition. Predict match scores, earn points, top the leaderboard.

## Features

- **Fixture browser** — all 104 World Cup 2026 matches with group, venue, and date
- **Score tipping** — predict home/away scores before each match kicks off
- **Points leaderboard** — 3 pts exact score, 1 pt correct outcome, 0 pts wrong
- **AI Co-Pilot** — per-match tactical analysis and win probabilities (GPT-4o-mini, DB-cached)
- **Auth** — email/password + GitHub and Google OAuth via Better Auth
- **Automated scoring** — cron endpoint scores completed matches and aggregates user points

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (React 19, SSR, file-based routing) |
| Auth | Better Auth (`tanstackStartCookies` plugin) |
| Database | Neon Serverless Postgres + Drizzle ORM |
| State/Cache | TanStack Query |
| AI | Vercel AI SDK + OpenAI (`gpt-4o-mini`) |
| Styling | Tailwind CSS |
| Testing | Vitest (unit) + Playwright (E2E) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- An [OpenAI](https://platform.openai.com) API key

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, OPENAI_API_KEY

# Push schema to database
npm run db:push

# Seed fixtures (local dev — 72 group stage matches from the real 2026 draw)
npm run db:seed:dev

# Start dev server
npm run dev
```

### OAuth Setup (optional)

To enable GitHub and Google sign-in, add credentials to `.env`:

```bash
# GitHub: Settings → Developer settings → OAuth Apps
# Callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Google: Cloud Console → APIs & Services → Credentials → OAuth 2.0
# Callback URL: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Commands

```bash
npm run dev            # Start dev server (http://localhost:3000)
npm run build          # Production build
npm run start          # Start production server

npm run test           # Unit tests (Vitest)
npm run test:watch     # Unit tests in watch mode
npm run test:e2e       # E2E tests (Playwright — requires dev server running)
npm run test:e2e:ui    # E2E tests with Playwright UI

npm run db:push        # Push schema changes to DB (development)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio (DB browser)
npm run db:seed:dev    # Seed 72 group stage fixtures (dev)
npm run db:seed        # Seed fixtures from API-Football (production)
```

## Architecture

The codebase uses **deep modules** (Ousterhout) — simple interfaces hiding implementation complexity.

```
src/features/<name>/
  <name>.repository.ts   # DEEP — all DB/LLM logic lives here
  <name>.server.ts       # thin — wraps repository as createServerFn; auth checks here
  <name>.queries.ts      # TanStack Query options (queryKey + queryFn)
```

Routes are thin view layers: they call server functions and render data. No DB imports, no business logic in routes.

### Adding a feature

1. `src/features/<name>/<name>.repository.ts` — named export object with async methods
2. `src/features/<name>/<name>.server.ts` — one `createServerFn` per repository method
3. Import the server function in the route — one import, one call

### Scoring cron

`POST /api/cron/score` (requires `x-cron-secret` header matching `CRON_SECRET` env var) scores all completed matches that have unscored tips, then recalculates each user's total points. Call this from Vercel Cron, a GitHub Actions schedule, or any HTTP scheduler.

```bash
# Manual trigger (dev)
curl -X POST http://localhost:3000/api/cron/score \
  -H "x-cron-secret: $CRON_SECRET"
```

## Database Schema

| Table | Purpose |
|---|---|
| `user` | Better Auth users + aggregated `points` |
| `session` | Better Auth sessions |
| `account` | OAuth provider accounts |
| `verification` | Email verification tokens |
| `matches` | Fixtures — 104 matches, groups A–L + knockouts |
| `tips` | User score predictions; `scoredAt` null = not yet scored |
| `ai_match_insights` | Cached LLM analysis per match |

## Project Structure

```
src/
  auth/
    auth.ts              # Better Auth config (email + GitHub + Google)
    auth.client.ts       # createAuthClient() for React hooks
  db/
    index.ts             # Drizzle client (Neon HTTP driver)
    schema.ts            # All table definitions
  features/
    matches/             # Fixture data
    tips/                # Tip submission + scoring logic
    insights/            # AI co-pilot (cache-first LLM)
    leaderboard/         # Top-N user rankings
    scoring/             # Batch scoring service
  routes/
    __root.tsx           # Root layout + Navbar
    index.tsx            # Dashboard
    login.tsx            # Sign in / Sign up
    leaderboard.tsx      # Leaderboard page
    matches/
      index.tsx          # Fixture list
      $matchId.tsx       # Match detail + tip form + AI co-pilot
    api/
      auth/$.ts          # Better Auth catch-all
      cron/score.ts      # Scoring trigger endpoint
  components/
    tip-form.tsx         # Auth-gated tip form
    route-error.tsx      # Route-level error boundary UI
scripts/
  seed-dev.ts            # 72 group stage fixtures (real 2026 WC draw)
  seed-matches.ts        # Fetch fixtures from API-Football
e2e/                     # Playwright E2E tests
```
