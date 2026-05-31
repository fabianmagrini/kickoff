# ADR-0003: Neon Serverless Postgres + Drizzle ORM

## Status
Accepted

## Context
The app needs a relational database (users, matches, tips have clear foreign-key relationships and need transactional integrity for scoring). It will be deployed to a serverless environment where persistent TCP connections are impractical. The ORM should give end-to-end TypeScript type safety without a separate code-generation step at runtime.

## Decision
Use **Neon Serverless Postgres** (HTTP driver via `@neondatabase/serverless`) with **Drizzle ORM**.

Neon was chosen over Supabase and PlanetScale because:
- The HTTP driver (`neon-http`) works in serverless and edge environments without connection pooling configuration.
- Branching and the Neon console are well-suited to a small project with a single developer.

Drizzle was chosen over Prisma because:
- Schema is defined in TypeScript; there is no separate `.prisma` file and no `prisma generate` step in CI.
- Queries are SQL-like and composable; the builder does not hide what queries are being issued.
- The `drizzle-kit` tooling handles migrations (`db:generate`, `db:migrate`) and schema push (`db:push`) without a running migration daemon.
- Bundle size is smaller, which matters for serverless cold starts.

## Consequences
- **Positive**: fully type-safe queries from schema definition to query result — no type assertions needed at DB boundaries.
- **Positive**: HTTP driver means no connection pool management in serverless deployments.
- **Positive**: `drizzle-kit studio` gives a GUI for inspecting data during development.
- **Negative**: Neon's HTTP driver initialises the connection string at module load time; if the module is accidentally bundled into the client (see ADR-0006), it throws immediately because `DATABASE_URL` is not available in the browser.
- **Negative**: Drizzle's query builder does not support all Postgres features (e.g. `WINDOW` functions) without falling back to raw `sql` template tags.
