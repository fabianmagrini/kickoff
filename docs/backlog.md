# Kickoff — Backlog

All planned features are shipped. See [completed.md](./completed.md) for history.
Outstanding work is infrastructure and operational hardening, in priority order.

---

## High Priority

---

## Medium Priority

### 4. Insight TTL / Cache Invalidation **→ Next**
`ai_match_insights` rows are written once and never refreshed. Form changes after initial generation make insights stale with no way to refresh short of a manual DB delete.

- Add a staleness check in `insightsRepository.getCached`: treat rows older than 24h before kickoff as stale
- On stale hit, call `getOrGenerate` to refresh and overwrite the cached row
- Add a unit test for the staleness check

*Key files:* `src/features/insights/insights.repository.ts`, `src/features/insights/insights.repository.test.ts`

### 5. Health Endpoint
No `GET /healthz` endpoint. Deployment platforms use health checks to decide when to route traffic to a new instance.

- Add `src/routes/api/healthz.ts` returning `Response.json({ ok: true })` with status 200
- No auth required
- Add a smoke test in the E2E suite

*Key files:* `src/routes/api/healthz.ts` (new), `e2e/` (smoke test)

---

## Low Priority

### 6. Admin Audit Log
When an admin updates a match score there is no record of who changed what or when.

- Add an `admin_audit_log` table: `id`, `matchId`, `userId`, `previousHomeScore`, `previousAwayScore`, `newHomeScore`, `newAwayScore`, `changedAt`
- Write a row in `adminRepository.updateMatch` before applying the update
- Expose a read-only view on the admin page

*Key files:* `src/db/schema.ts`, `src/features/admin/admin.repository.ts`, `src/routes/admin.tsx`
