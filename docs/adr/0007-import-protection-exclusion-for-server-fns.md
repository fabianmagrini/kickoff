# ADR-0007: Exclude feature server files from import-protection on the client

## Status
Accepted

## Context

TanStack Start ships a Vite plugin that blocks `**/*.server.*` files from being imported in the client environment (import-protection). The intent is to prevent server-only logic from leaking into the browser bundle.

However, the same plugin also provides `createServerFn`, which transforms `*.server.ts` files into HTTP RPC stubs for client-side use. When import-protection intercepts a `features/*.server.ts` import on the client before the server-fn transform can run, it replaces the module with a mock that throws on every call. The result is that any route loader triggered by client-side navigation hangs indefinitely — the loader awaits a server fn that never resolves.

## Decision

`vite.config.ts` passes `importProtection.client.excludeFiles: ['**/features/**/*.server.*']` to `tanstackStart()`. This tells import-protection to leave those files alone on the client, allowing TanStack Start's own server-fn transform to replace them with the correct HTTP RPC stubs.

Files outside `features/` (e.g. `src/auth/auth.server.ts` if one existed) remain subject to the default rules.

## Consequences

- SPA navigation works correctly: client-side loaders call server fns via `/_serverFn/…` HTTP requests as intended.
- `features/*.server.ts` modules are no longer protected from accidental direct use in client code by import-protection alone — the server-fn transform is the only guard. In practice every export in these files is a `createServerFn` result, so there is no server-only logic to leak.
- If a future `features/*.server.ts` file contains non-`createServerFn` exports that must never run on the client, it must be protected explicitly (e.g. by moving the logic to the repository layer).
