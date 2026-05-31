# ADR-0002: Deep modules architecture (repository → server fn → route)

## Status
Accepted

## Context
Without a clear boundary, it is easy for database queries, auth checks, and UI logic to become interleaved. Routes start importing `db` directly; business rules scatter across files; auth checks get duplicated or missed. The codebase needed a layering rule that is simple enough to follow consistently.

## Decision
Each feature module uses exactly two layers on top of the route:

1. **`*.repository.ts`** (deep module) — owns all DB queries and LLM calls. The only files that may import `db` and the schema. Exposes a named object with async methods.
2. **`*.server.ts`** (thin transport) — wraps each repository method as a `createServerFn` call. Auth checks live here, not in repositories. Server functions must not call other server functions.
3. **`routes/`** (view layer) — imports server functions and renders data. No DB imports, no business logic.

The term "deep module" (from John Ousterhout's *A Philosophy of Software Design*) signals that the interface is small but the implementation hides significant complexity.

## Consequences
- **Positive**: a single, consistent rule — "DB only in repositories; auth only in server fns; UI only in routes" — is easy to enforce in code review.
- **Positive**: repositories are testable in isolation with a mocked `db` (see the `selectQueue` pattern in `scoring.service.test.ts`).
- **Positive**: auth logic is never duplicated and never forgotten — every server function either checks the session or explicitly does not.
- **Negative**: for very simple CRUD features the two layers feel like boilerplate; adding a one-liner DB query requires touching three files.
- **Negative**: repositories may depend on other repositories (e.g. `insightsRepository` calls `matchesRepository.getById`), which requires care to avoid circular imports.
