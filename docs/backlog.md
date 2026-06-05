# Kickoff — Backlog

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
