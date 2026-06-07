# Kickoff — Completed Work

Items removed from the active backlog, in reverse chronological order.

---

## CI/CD Pipeline
GitHub Actions workflow running unit tests and production build on every PR and push to main. E2E omitted until a preview deployment is available.

- `.github/workflows/ci.yml`: `npm ci` → `npm run test` → `npm run build` on `ubuntu-latest` / Node 22
- No secrets required — unit tests mock the DB; build uses the existing Neon fallback URL

**Shipped:** 2026-06-08 · (commit pending)

---

## Multi-Competition Support
Competitions become a first-class concept — the World Cup is one competition among many.

- Schema: `competitions`, `user_competition_points` tables; `competitionId` FK on `matches` and `leagues`
- Migration script: `scripts/migrate-to-competitions.ts` (one-time backfill)
- Feature module: `src/features/competitions/` (repository, server fn, queries, unit tests)
- Updated: matches, leaderboard, dashboard, leagues, scoring service, insights — all competition-scoped
- Routes: `/competitions/$id/matches`, `/competitions/$id/leaderboard`, `/competitions/$id/leagues/*`
- Home page: redirects to active competition or shows selector for multiple
- Seed script `seed-dev.ts` updated to create/find competition before inserting fixtures
- 71 unit tests, 47 E2E tests passing (2 skips: cached insight + admin fixme)
- ADR-0008 documents the key decisions

**Shipped:** 2026-06-07 · `b9b57e5` (feature) + `a75971d` (test gaps)

---

## Private Leagues
Invite-code-based groups with their own scoped leaderboard, competition-scoped.

- Schema: `leagues`, `league_members` tables (`src/db/schema.ts`); `competitionId` FK added in multi-competition refactor
- Repository: `create`, `joinByCode`, `getMyLeagues`, `getById`, `getLeaderboard` (`src/features/leagues/`)
- Routes: `/competitions/$id/leagues/` (list + create), `/competitions/$id/leagues/$leagueId`, `/competitions/$id/leagues/join`
- 10 unit tests, 5 E2E tests

**Shipped:** 2026-06-07 · `3d5b542` (initial) · routes updated in `b9b57e5`

---

## Admin UI — Manual Score Entry
Route `/admin` allowing admins to set match scores and status; saving a completed match triggers automatic re-scoring.

- Schema: no changes (uses existing `matches` table)
- Repository: `updateMatch` (`src/features/admin/admin.repository.ts`)
- Server fn: `checkIsAdminFn`, `updateMatchFn` — gated by `ADMIN_USER_IDS` env var (`src/features/admin/admin.server.ts`)
- Route: `src/routes/admin.tsx` — competition selector dropdown + inline edit table per competition
- 6 unit tests, 2 E2E tests (auth boundary); UI interaction requires a real admin user

**Shipped:** 2026-06-05 · `aebdc79` (initial) · competition selector added in `b9b57e5`
