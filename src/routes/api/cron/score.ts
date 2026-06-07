import { createFileRoute } from '@tanstack/react-router';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';

export const Route = createFileRoute('/api/cron/score')({
  // @ts-expect-error - server.handlers not in TanStack Router types
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = request.headers.get('x-cron-secret');
        if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
          return new Response('Unauthorized', { status: 401 });
        }

        let tipsScored = 0;
        let matchesProcessed = 0;
        let result;
        do {
          result = await scoreCompletedMatches();
          tipsScored += result.tipsScored;
          matchesProcessed += result.matchesProcessed;
        } while (result.remaining > 0);
        return Response.json({ tipsScored, matchesProcessed, remaining: 0 });
      },
    },
  },
});
