# Kickoff — Backlog

All planned features are shipped. See [completed.md](./completed.md) for history.
Outstanding work is infrastructure and operational hardening, in priority order.

---

## High Priority

---

## Medium Priority

### 4. Health Endpoint **→ Next**
No `GET /healthz` endpoint. Deployment platforms use health checks to decide when to route traffic to a new instance.

- Add `src/routes/api/healthz.ts` returning `Response.json({ ok: true })` with status 200
- No auth required
- Add a smoke test in the E2E suite

*Key files:* `src/routes/api/healthz.ts` (new), `e2e/` (smoke test)

---

## Low Priority

### 5. Admin Audit Log
When an admin updates a match score there is no record of who changed what or when.

- Add an `admin_audit_log` table: `id`, `matchId`, `userId`, `previousHomeScore`, `previousAwayScore`, `newHomeScore`, `newAwayScore`, `changedAt`
- Write a row in `adminRepository.updateMatch` before applying the update
- Expose a read-only view on the admin page

*Key files:* `src/db/schema.ts`, `src/features/admin/admin.repository.ts`, `src/routes/admin.tsx`
