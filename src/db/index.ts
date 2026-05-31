import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// In dev mode the bundler can pull this module into the client bundle even though
// it is server-only. Providing a non-empty fallback prevents neon() from throwing
// at import time; no queries are ever executed client-side.
const sql = neon(process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost/server-only');
export const db = drizzle({ client: sql, schema });
