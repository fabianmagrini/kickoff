# ADR-0004: Better Auth for authentication

## Status
Accepted

## Context
The app needs email/password sign-in, OAuth (GitHub, Google), and session management that works with TanStack Start's server function model (cookie-based sessions readable in `createServerFn` handlers on both client-initiated and SSR requests).

The main candidates were Auth.js (NextAuth v5), Clerk, Supabase Auth, and Better Auth.

## Decision
Use **Better Auth** with the `tanstackStartCookies` plugin.

Reasons:
- **Native TanStack Start integration**: the `tanstackStartCookies` plugin ensures session cookies are forwarded correctly in both SSR and server function contexts without manual cookie plumbing.
- **Self-hosted**: auth data lives in the same Neon Postgres database, using Better Auth's Drizzle adapter. No separate auth database, no third-party vendor with user PII.
- **Flexible provider model**: GitHub and Google OAuth are optional — if the env vars are absent the providers are simply omitted from the config, which simplifies local development.
- **No per-seat pricing**: Clerk and similar services charge per monthly active user, which is inappropriate for a cost-sensitive tipping app.

Auth checks are enforced in the server fn layer (never in repositories or routes) by calling `auth.api.getSession({ headers: getRequest().headers })`.

## Consequences
- **Positive**: session is available in every server function with a single call; no middleware configuration needed.
- **Positive**: user table is in the same DB, so JOINs against `users` from tip/leaderboard queries work without cross-service calls.
- **Negative**: Better Auth v1.x ships with Zod v4 as a direct dependency. If the app's top-level Zod version is v3, Vite resolves the shared `zod` module to v3 even for Better Auth's own code, causing `z.coerce.boolean().meta is not a function` at runtime (see ADR-0006).
- **Negative**: Better Auth is a younger library than Auth.js; the API surface has changed between minor versions.
