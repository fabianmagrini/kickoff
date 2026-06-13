import { createFileRoute } from '@tanstack/react-router';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const Route = createFileRoute('/api/healthz')({
  // @ts-expect-error - server.handlers not in TanStack Router types
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`SELECT 1`);
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false, error: 'db' }, { status: 503 });
        }
      },
    },
  },
});
