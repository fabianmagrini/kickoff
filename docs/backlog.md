# Kickoff — Backlog

## 1. `tip-form.tsx` E2E Tests
The optimistic tip submission flow has no test coverage.

- Authenticated user submits a tip → UI updates immediately (optimistic state)
- Server error → UI rolls back to the empty form
- Existing tip renders correctly (predicted score shown, locked message)
- Requires a seeded DB with at least one scheduled match and an authenticated session
- File: `e2e/tip-form.spec.ts`

## 3. E2E Coverage for Seeded-DB Flows
Both match-detail tests in `matches.spec.ts` currently skip without a seeded DB.

- Add a test fixture setup that seeds at least one match before the suite runs
- Cover: match detail page loads, tip form unauthenticated state, AI co-pilot section
- Consider a Playwright `globalSetup` script that calls `npm run db:seed:dev`

## 4. Admin UI / Manual Score Entry
No way to update match results without direct DB access or the API-Football cron.

- Route: `/admin` (auth-gated to an admin role or env-var flag)
- Form to set `homeScore`, `awayScore`, and `status` on a match
- Triggers re-scoring on save (calls `scoreCompletedMatches`)
- Requires adding an `isAdmin` field to the user schema or an `ADMIN_USER_IDS` env var

## 5. Private Leagues
Invite-code-based groups with their own scoped leaderboard.

- New schema: `leagues` (id, name, invite code) and `league_members` (league_id, user_id)
- Routes: `/leagues`, `/leagues/$leagueId`, `/leagues/join`
- Server functions: create league, generate invite code, join by code, get league leaderboard
- Leaderboard scoped to league members only
