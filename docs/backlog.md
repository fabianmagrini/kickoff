# Kickoff — Backlog

All planned features are shipped. Outstanding work is infrastructure and operational hardening.

---

## High Priority

### 1. CI/CD Pipeline
No automated test or build runs on PRs or pushes. Regressions can ship undetected.

- Add `.github/workflows/ci.yml`
- On every PR: `npm run test` (Vitest unit tests) + `npm run build`
- On merge to `main`: additionally run `npm run test:e2e` against a preview deployment
- Set `CRON_SECRET`, `DATABASE_URL`, and AI provider keys as GitHub Actions secrets

### 2. Rate Limiting on AI Co-Pilot
The `/api/cron/score` endpoint is secret-gated, but `getOrGenerateInsightFn` has no per-user cooldown. A user can trigger repeated LLM calls by refreshing the match detail page before the cache is populated.

- Add a per-user+per-match cooldown (e.g. 60s) in `insightsRepository.getOrGenerate`
- Return a `429`-style error or silently return `null` when the cooldown is active
- Alternatively: pre-generate insights in a background job when matches are seeded

### 3. Structured Logging
Errors in server functions and repositories are currently swallowed silently or surface only as generic "Something went wrong" messages with no server-side trace.

- Add `pino` with a request-ID middleware
- Log errors at `error` level with stack traces in production
- Log slow DB queries at `warn` level (threshold: >500ms)

---

## Medium Priority

### 4. Paginate `scoreCompletedMatches()`
The scoring loop processes all completed matches sequentially in a single function call. At tournament scale (64 matches × many tips) this blocks the event loop and risks hitting Neon's HTTP request timeout.

- Process matches in chunks of N (e.g. 10) per invocation
- Return `{ tipsScored, matchesProcessed, remaining }` so the cron caller knows whether to re-trigger
- Update `scoring.service.test.ts` to cover the chunking behaviour

### 5. Insight TTL / Cache Invalidation
`ai_match_insights` rows are written once and never refreshed. Form changes (injury news, weather) after the initial generation make the insight stale with no way to refresh it short of a manual DB delete.

- Add a `generatedAt` check in `insightsRepository.getCached`: treat rows older than 24h before kickoff as stale
- On stale hit, call `getOrGenerate` to refresh and overwrite the cached row
- Add a unit test for the staleness check

### 6. Health Endpoint
No `GET /healthz` endpoint exists. Deployment platforms (Render, Railway, Fly.io) use health checks to decide when to route traffic to a new instance.

- Add `src/routes/api/healthz.ts` returning `Response.json({ ok: true })` with status 200
- No auth required
- Add to routeTree and include a smoke test in the E2E suite

---

## Low Priority

### 7. Admin Audit Log
When an admin updates a match score the change is applied immediately with no record of who changed what or when. If a score is entered incorrectly, there is no way to tell from the DB who made the error.

- Add an `admin_audit_log` table: `id`, `matchId`, `userId`, `previousHomeScore`, `previousAwayScore`, `newHomeScore`, `newAwayScore`, `changedAt`
- Write a row in `adminRepository.updateMatch` before applying the update
- Expose a read-only view on the admin page
