# Kickoff — Completed Work

Items removed from the active backlog, in reverse chronological order.

---

## Multi-Competition Support
Competitions become a first-class concept — the World Cup is one competition among many.

- Schema: `competitions`, `user_competition_points` tables; `competitionId` FK on `matches` and `leagues`
- Migration script: `scripts/migrate-to-competitions.ts` (one-time backfill)
- Feature module: `src/features/competitions/` (repository, server fn, queries)
- Updated: matches, leaderboard, dashboard, leagues, scoring service, insights — all competition-scoped
- Routes: `/competitions/$id/matches`, `/competitions/$id/leaderboard`, `/competitions/$id/leagues/*`
- Home page: redirects to active competition or shows selector for multiple
- Seed script `seed-dev.ts` updated to create/find competition before inserting fixtures
- 61 unit tests, 47/48 E2E tests passing (1 skip: cached insight requires prior data)
- ADR-0008 documents the key decisions

**Shipped:** 2026-06-07 · (commit pending)

---

## Private Leagues
Invite-code-based groups with their own scoped leaderboard.

- Schema: `leagues`, `league_members` tables (`src/db/schema.ts`)
- Repository: `create`, `joinByCode`, `getMyLeagues`, `getById`, `getLeaderboard` (`src/features/leagues/`)
- Routes: `/leagues` (list + create), `/leagues/$leagueId` (scoped leaderboard), `/leagues/join`
- Navbar: Leagues link added to `src/routes/__root.tsx`
- 10 unit tests, 6 E2E tests

**Shipped:** 2026-06-07 · `3d5b542`

---

## Admin UI — Manual Score Entry
Route `/admin` allowing admins to set match scores and status; saving a completed match triggers automatic re-scoring.

- Schema: no changes (uses existing `matches` table)
- Repository: `updateMatch` (`src/features/admin/admin.repository.ts`)
- Server fn: `checkIsAdminFn`, `updateMatchFn` — gated by `ADMIN_USER_IDS` env var (`src/features/admin/admin.server.ts`)
- Route: `src/routes/admin.tsx` — inline edit table for all fixtures
- 6 unit tests, 2 E2E tests

**Shipped:** 2026-06-05 · `aebdc79`
