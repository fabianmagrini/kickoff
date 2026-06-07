import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/healthz')({
  // @ts-expect-error - server.handlers not in TanStack Router types
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
    },
  },
});
