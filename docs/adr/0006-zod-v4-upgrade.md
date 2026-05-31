# ADR-0006: Upgrade Zod to v4 to resolve better-auth version conflict

## Status
Accepted

## Context
The project started with Zod v3 (`^3.24.2`). Better Auth v1.2.7 declares `"zod": "^4.3.6"` as a direct dependency and uses Zod v4 APIs internally (e.g. `z.coerce.boolean().meta({...})`).

In Vite's dev-mode module resolution, `import * as z from 'zod'` inside better-auth's own dist files resolved to the project's top-level Zod v3, not better-auth's nested Zod v4, even though npm had installed v4 under `node_modules/better-auth/node_modules/zod`. Vite deduplicated to the top-level package.

This caused `z.coerce.boolean(...).meta is not a function` to throw at module initialisation time in the browser, preventing React from hydrating the page. All client-side interactivity was silently broken; SSR-rendered HTML still appeared correct, masking the problem.

A second related issue: `neon()` in `src/db/index.ts` is called at module evaluation time. Because the Vite dev server did not fully strip the `@/db` import chain from the client bundle (a known limitation of TanStack Start v1 in dev mode), the module executed in the browser where `DATABASE_URL` is absent, throwing `"No database connection string was provided"`. This was fixed by providing a valid-format fallback URL (`postgresql://user:pass@localhost/server-only`) that passes Neon's URL validation but is never used for actual queries.

## Decision
- Upgrade the project's Zod dependency to `^4` so npm deduplicates to a single Zod v4 that satisfies both the app and better-auth.
- Add a valid-format fallback to `neon()` in `src/db/index.ts` to survive accidental client-bundle inclusion in dev mode.
- Guard `session?.user` with optional chaining in the Navbar (`__root.tsx`) because better-auth's `useSession()` can return a truthy object with `user: undefined` during the initial session GET before hydration completes.

## Consequences
- **Positive**: React hydration completes correctly; client-side interactivity (form toggles, auth flows) works in Playwright E2E tests.
- **Positive**: a single Zod version in the dependency tree avoids future version-skew bugs.
- **Negative**: Zod v4 is a major version with some breaking changes. Existing Zod usage (`z.object`, `z.string().uuid()`, `z.number().int()`) was verified to be compatible before upgrading.
- **Negative**: the Neon fallback URL is a workaround for a TanStack Start dev-mode bundling limitation, not a root-cause fix. The proper fix is for the framework's Vite plugin to fully strip server-only imports from the client bundle in dev mode.
