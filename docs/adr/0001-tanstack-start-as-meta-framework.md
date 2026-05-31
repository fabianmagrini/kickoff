# ADR-0001: TanStack Start as meta-framework

## Status
Accepted

## Context
The app requires SSR for fast initial loads (the fixture list and leaderboard must be populated on the server before the page is sent to the browser), file-based routing to keep route code co-located, and a way to call server-side logic from client components without manually building API routes. The main candidates were Next.js (App Router), Remix, and TanStack Start.

## Decision
Use **TanStack Start** (built on Vinxi + Vite, React 19).

Key reasons:
- **`createServerFn`** lets server-side data fetching and mutations be defined inline in feature modules and called from the client with full TypeScript types — no manual API routes, no `fetch()` boilerplate, no route handler files.
- **TanStack Router** (file-based) and **TanStack Query** are first-class — the router's loader/context pattern integrates directly with the query cache, eliminating the need for separate server-state management.
- Vite dev server gives fast HMR and a familiar plugin ecosystem.
- The framework is React-first and avoids the Next.js App Router's split mental model between Server Components and Client Components.

## Consequences
- **Positive**: no manual API layer; server functions are co-located with the feature code they serve; loader → query cache integration means data is available instantly on navigation.
- **Positive**: provider-agnostic deployment (Vercel, Netlify, Node server via `.output/server/index.mjs`).
- **Negative**: TanStack Start v1 is relatively new; some rough edges exist (e.g. the Vite dev server does not fully strip server-only code from the client bundle in dev mode — see ADR-0006).
- **Negative**: `startTransition(() => hydrateRoot(...))` defers hydration as a low-priority concurrent update, which means event handlers are not attached immediately after `networkidle`; E2E tests need an explicit hydration gate.
