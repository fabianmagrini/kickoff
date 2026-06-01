# Kickoff — Backlog

## 1. Fix Auth Session Cookie (blocks tip-form E2E)
The `/api/auth/$` catch-all route uses `createFileRoute` which wraps the
`auth.handler(request)` response in TanStack Start's HTML page render.
`tanstackStartCookies`' `setCookie()` call has no effect on that HTML
response, so sign-up and sign-in redirect to `/` but leave no session cookie.

- Replace `createFileRoute('/api/auth/$')` with TanStack Start's raw API-route
  mechanism so `auth.handler(request)` response (with its `Set-Cookie` headers)
  is passed through directly
- Verify with: sign up → navbar shows user name → navigate to match → tip form visible
- Once fixed, enable the four skipped tests in `e2e/tip-form.spec.ts`

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
