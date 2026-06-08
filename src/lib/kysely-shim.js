// kysely shim — re-exports the full kysely surface plus the two constants
// that kysely 0.29.x moved from the main entry to kysely/migration.
// better-auth's SQLite dialects import them from the top-level package;
// this shim satisfies that import so the nitro bundle compiles cleanly.
// Imports use dist-relative paths to avoid triggering the 'kysely' alias.
export * from '../../node_modules/kysely/dist/index.js';
export { DEFAULT_MIGRATION_TABLE, DEFAULT_MIGRATION_LOCK_TABLE } from '../../node_modules/kysely/dist/migration/migrator.js';
