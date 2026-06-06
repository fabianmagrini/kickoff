# Kickoff — Backlog

## 5. Private Leagues
Invite-code-based groups with their own scoped leaderboard.

- New schema: `leagues` (id, name, invite code) and `league_members` (league_id, user_id)
- Routes: `/leagues`, `/leagues/$leagueId`, `/leagues/join`
- Server functions: create league, generate invite code, join by code, get league leaderboard
- Leaderboard scoped to league members only
