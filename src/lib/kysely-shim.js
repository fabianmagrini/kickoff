// kysely shim — provides the two constants that kysely 0.29.x moved from its
// main entry to kysely/migration, but which better-auth's SQLite dialects still
// import from the top-level package. We use Neon so those dialects are dead code,
// but the import must resolve at bundle time.
//
// Values inlined as literals: they are stable DB table names that cannot change
// without breaking all existing kysely migrations, so they will not shift across
// minor/patch versions.
//
// Cannot use `from 'kysely/migration'` here because the Vite alias 'kysely' →
// this file causes rolldown to resolve 'kysely/migration' as this file + /migration
// (a non-existent path). Cannot use `from '../../node_modules/kysely/dist/index.js'`
// for these because they are not exported from index.js in 0.29.x.
export const DEFAULT_MIGRATION_TABLE = 'kysely_migration';
export const DEFAULT_MIGRATION_LOCK_TABLE = 'kysely_migration_lock';

// Re-export the full kysely surface that better-auth uses at runtime (Kysely class,
// dialects, sql tag, etc.). Importing from the dist path directly avoids the alias.
export * from '../../node_modules/kysely/dist/index.js';
