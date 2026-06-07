# ADR-0008: Multi-competition architecture

## Status
Accepted

## Context
The app was originally built for a single implicit context — FIFA World Cup 2026. Every match, leaderboard, league, and user stat existed in one global namespace. To support additional competitions (UEFA Euro, Copa América, AFL, etc.) without a full rewrite, competitions needed to become a first-class schema concept rather than an implicit assumption.

Key decisions made:
- **Per-competition points**: each user's score is tracked separately per competition via a `user_competition_points` join table. `users.points` is retained as a global total for profile summary. This means users get separate ranks per competition rather than one aggregate rank across all competitions.
- **Competition-scoped leagues**: leagues belong to one competition. The league leaderboard uses `user_competition_points` for that competition (with `leftJoin` so members with zero points still appear).
- **Nested URL structure**: `/competitions/$id/matches`, `/competitions/$id/leaderboard`, etc. The match detail page (`/matches/$matchId`) stays at a flat global path because match IDs are globally unique and the detail page doesn't need competition context for data fetching.
- **Home page redirect**: `/` calls `getActive()` and redirects to the single active competition if exactly one exists, or shows a competition selector if multiple are active.

## Decision
Introduce a `competitions` table (slug, sport, status, dates) and a `user_competition_points` table (userId, competitionId, points). Add `competitionId` FK to `matches` and `leagues`. Update all repositories to accept `competitionId`. Replace flat routes with nested `/competitions/$id/...` routes. Provide a one-time migration script (`scripts/migrate-to-competitions.ts`) to backfill existing data.

## Consequences
- **Positive**: adding a second competition requires only seeding a `competitions` row and fixtures — no schema or code changes.
- **Positive**: leaderboards and league rankings are meaningful per-competition rather than a confusing aggregate.
- **Positive**: the home page gracefully handles zero, one, or many active competitions.
- **Negative**: all E2E tests that previously used flat `/matches`, `/leaderboard`, `/leagues` URLs needed updating to extract the competition ID from a redirect. Tests now use a shared `getCompetitionId(page)` helper.
- **Negative**: the scoring service now runs two DB writes per user per match (global total + competition total) instead of one.
- **Negative**: the league leaderboard requires a `leftJoin` with `user_competition_points` (rather than `innerJoin`) so members with zero scored tips still appear.
