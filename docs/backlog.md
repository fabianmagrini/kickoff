# Kickoff — Backlog

All planned features are shipped. See [completed.md](./completed.md) for history.
Outstanding work is infrastructure and operational hardening, in priority order.

---

## High Priority

---

## Medium Priority

---

## Low Priority

### 4. Admin Audit Log **→ Next**
When an admin updates a match score there is no record of who changed what or when.

- Add an `admin_audit_log` table: `id`, `matchId`, `userId`, `previousHomeScore`, `previousAwayScore`, `newHomeScore`, `newAwayScore`, `changedAt`
- Write a row in `adminRepository.updateMatch` before applying the update
- Expose a read-only view on the admin page

*Key files:* `src/db/schema.ts`, `src/features/admin/admin.repository.ts`, `src/routes/admin.tsx`
