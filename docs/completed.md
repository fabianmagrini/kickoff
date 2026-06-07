# Kickoff — Completed Work

Items removed from the active backlog, in reverse chronological order.

---

## Code Review: 8 Correctness Fixes
A high-effort code review surfaced and fixed 8 bugs across the infrastructure hardening commits.

- `admin.repository.ts`: added TOCTOU guard (`if (!updated) throw`) after `db.update().returning()` — protects against match deleted between select and update
- `admin.repository.ts`: `updateMatch` now loops `scoreCompletedMatches()` until `remaining === 0`, matching the cron handler — previously a single admin save could leave matches unscored
- `insights.repository.ts`: excluded `matchId` (PK) from `onConflictDoUpdate` `set` — passing the conflict target in `SET` is semantically wrong
- `scoring.service.ts`: moved chunk guard before the `unscoredTips` query — avoids a DB round-trip for every over-chunk match per cron invocation
- `admin.repository.test.ts`: added TOCTOU crash test and `remaining > 0` loop test; made `insertBuilder.values` chainable
- `scoring.service.test.ts`: removed now-obsolete m3 tips queue entry (chunk guard fires before the tips query)
- `insights.repository.test.ts`: replaced duplicate fresh-cache test with a threshold-boundary test; converted module-level `throw` to a named `it()` test

**Shipped:** 2026-06-08 · `e409bf0`

---

## Admin Audit Log
Score changes made via the admin panel are now recorded in `admin_audit_log`. The "Recent Changes" section on the admin page shows who changed what and when, and updates live after each save.

- `src/db/schema.ts`: new `adminAuditLog` table (`matchId`, `userId`, `previousHomeScore`, `previousAwayScore`, `newHomeScore`, `newAwayScore`, `changedAt`)
- `drizzle/0000_puzzling_quasar.sql`: migration file generated
- `src/features/admin/admin.repository.ts`: `updateMatch` now accepts `userId`, fetches current state, inserts audit row before applying update; new `getAuditLog(limit)` method with match + user join
- `src/features/admin/admin.server.ts`: passes `user.id` from `requireAdmin()` to `updateMatch`; new `getAuditLogFn`
- `src/features/admin/admin.queries.ts`: `auditLogQueryOptions`
- `src/routes/admin.tsx`: loads audit log in parallel with competitions; `AuditLogTable` component; invalidates `['admin', 'audit-log']` after each update

**Shipped:** 2026-06-08 · `9c66244`

---

## Health Endpoint
`GET /api/healthz` returns `{ ok: true }` with status 200. No auth required. Used by deployment platforms for readiness checks.

- `src/routes/api/healthz.ts`: new route using the same `server.handlers` pattern as the cron endpoint
- `e2e/healthz.spec.ts`: smoke test verifying status 200 and response body

**Shipped:** 2026-06-08 · `e93ae57`

---

## Insight TTL / Cache Invalidation
Stale `ai_match_insights` rows (generated before the 24h-before-kickoff window) are now automatically refreshed on the next `getOrGenerate` call. Completed matches are never re-queried.

- `src/features/insights/insights.repository.ts`: added `isStale(insight, matchDate)` helper; `getOrGenerate` now fetches the match in parallel with the cache lookup and upserts on a stale hit
- `src/features/insights/insights.repository.test.ts`: added `generatedAt` to fixture; added `onConflictDoUpdate` to insert builder; added staleness, stale-overwrite, completed-match-guard, and threshold-boundary tests

**Shipped:** 2026-06-08 · `745ed8c`

---

## Paginate `scoreCompletedMatches()`
`scoreCompletedMatches(chunkSize = 10)` now processes completed matches in chunks, returning `{ tipsScored, matchesProcessed, remaining }`. The cron handler loops until `remaining === 0`, keeping each DB round-trip under Neon's HTTP timeout.

- `src/features/scoring/scoring.service.ts`: added `chunkSize` param, `remaining` counter, chunk-limit guard
- `src/features/scoring/scoring.service.test.ts`: updated all assertions to include `remaining`; added chunking coverage test
- `src/routes/api/cron/score.ts`: loops `scoreCompletedMatches` until `remaining === 0`, returns accumulated totals

**Shipped:** 2026-06-08 · `1c0fc86`

---

## Structured Logging
Pino-based structured logging across all server functions; errors and slow calls surface in production logs with a per-request ID for correlation.

- `src/lib/logger.ts`: pino singleton + `logServerFn` wrapper (generates `reqId` via `crypto.randomUUID()`; logs auth rejections at `warn`, other errors at `error` with stack; logs slow calls >500ms at `warn`)
- All 9 `*.server.ts` files updated to wrap handlers in `logServerFn`
- `LOG_LEVEL` env var controls verbosity (default: `info`)

**Shipped:** 2026-06-08 · `5d3bc47`

---

## CI/CD Pipeline
GitHub Actions workflow running unit tests and production build on every PR and push to main. E2E omitted until a preview deployment is available.

- `.github/workflows/ci.yml`: `npm ci` → `npm run test` → `npm run build` on `ubuntu-latest` / Node 22
- No secrets required — unit tests mock the DB; build uses the existing Neon fallback URL

**Shipped:** 2026-06-08 · `7b5f1ea`

---

## Rate Limiting on AI Co-Pilot
Per-user+per-match 60-second cooldown on the insight generation endpoint; auth now required to use AI Co-Pilot.

- `insights.server.ts`: added auth check + in-process `cooldowns` Map keyed on `userId:matchId`; throws with a user-readable message when the cooldown is active
- `matches/$matchId.tsx`: error message now shows the actual server message (covers both rate-limit and failure cases); "Consult Co-Pilot" button gated behind `isAuthenticated`; unauthenticated users see "Sign in to use AI Co-Pilot"

**Shipped:** 2026-06-08 · `5e55c1e`

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
