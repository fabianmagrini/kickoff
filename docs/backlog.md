# Kickoff — Backlog

## 1. Optimistic Tip Submission
`TipForm` currently waits for the server round-trip before updating the UI.

- Add `onMutate` / `onError` rollback pattern in `tip-form.tsx`
- Invalidate `userTipQueryOptions` on `onSettled`
- Ref: `src/features/tips/tips.queries.ts`

## 2. `matches.repository` Unit Tests
The only feature repository without a co-located `.test.ts`.

- Test `getAll()`: empty result, row shape
- Test `getById()`: found, not found (returns null)
- Follow the `selectQueue` pattern in `scoring.service.test.ts`
- File: `src/features/matches/matches.repository.test.ts`

## 3. `insights.repository` Unit Tests
Cache-first LLM call — more complex than the others.

- Test `getCached()`: cache hit returns row, cache miss returns null
- Test `getOrGenerate()`: cache hit skips LLM, cache miss calls LLM and writes to DB
- Requires mocking both `@/db` and the AI model (`@/ai`)
- File: `src/features/insights/insights.repository.test.ts`

## 4. E2E Coverage for Seeded-DB Flows
Both match-detail tests in `matches.spec.ts` currently skip without a seeded DB.

- Add a test fixture setup that seeds at least one match before the suite runs
- Cover: match detail page loads, tip form unauthenticated state, AI co-pilot section
- Consider a Playwright `globalSetup` script that calls `npm run db:seed:dev`

## 5. Admin UI / Manual Score Entry
No way to update match results without direct DB access or the API-Football cron.

- Route: `/admin` (auth-gated to an admin role or env-var flag)
- Form to set `homeScore`, `awayScore`, and `status` on a match
- Triggers re-scoring on save (calls `scoreCompletedMatches`)
- Requires adding an `isAdmin` field to the user schema or an `ADMIN_USER_IDS` env var

## 6. Private Leagues
Invite-code-based groups with their own scoped leaderboard.

- New schema: `leagues` (id, name, invite code) and `league_members` (league_id, user_id)
- Routes: `/leagues`, `/leagues/$leagueId`, `/leagues/join`
- Server functions: create league, generate invite code, join by code, get league leaderboard
- Leaderboard scoped to league members only
