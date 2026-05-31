# Architecture Decision Records

Significant technical decisions for the Kickoff project, in the format proposed by Michael Nygard.

Each ADR captures the context that led to a decision, the decision itself, and its consequences — including the trade-offs accepted. The goal is to make the *why* recoverable without reading git history.

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](./0001-tanstack-start-as-meta-framework.md) | TanStack Start as meta-framework | Accepted |
| [0002](./0002-deep-modules-architecture.md) | Deep modules architecture (repository → server fn → route) | Accepted |
| [0003](./0003-neon-postgres-and-drizzle-orm.md) | Neon Serverless Postgres + Drizzle ORM | Accepted |
| [0004](./0004-better-auth-for-authentication.md) | Better Auth for authentication | Accepted |
| [0005](./0005-ai-insights-with-db-cache.md) | AI insights with database-level cache | Accepted |
| [0006](./0006-zod-v4-upgrade.md) | Upgrade Zod to v4 to resolve better-auth version conflict | Accepted |

## Adding a new ADR

1. Copy the template below into `docs/adr/NNNN-short-title.md`.
2. Fill in Context, Decision, and Consequences.
3. Add a row to the index above.
4. If the new ADR supersedes an existing one, update the old ADR's status to `Superseded by ADR-NNNN`.

```markdown
# ADR-NNNN: Title

## Status
Accepted

## Context


## Decision


## Consequences

```
