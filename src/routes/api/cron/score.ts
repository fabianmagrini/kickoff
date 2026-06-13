import { createFileRoute } from '@tanstack/react-router';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';

// Leave 10s headroom before Vercel's 300s pro function limit.
const SCORING_DEADLINE_MS = 270_000;

async function runScoring() {
  const deadline = Date.now() + SCORING_DEADLINE_MS;
  let tipsScored = 0;
  let matchesProcessed = 0;
  let remaining = 0;
  let result;
  do {
    result = await scoreCompletedMatches();
    tipsScored += result.tipsScored;
    matchesProcessed += result.matchesProcessed;
    remaining = result.remaining;
  } while (result.remaining > 0 && Date.now() < deadline);
  return Response.json({ tipsScored, matchesProcessed, remaining });
}

export const Route = createFileRoute('/api/cron/score')({
  // @ts-expect-error - server.handlers not in TanStack Router types
  server: {
    handlers: {
      // POST: manual trigger or external cron — validates x-cron-secret header
      POST: async ({ request }: { request: Request }) => {
        const cronSecret = process.env.CRON_SECRET?.trim();
        const secret = request.headers.get('x-cron-secret');
        if (!cronSecret || secret !== cronSecret) {
          return new Response('Unauthorized', { status: 401 });
        }
        return runScoring();
      },

      // GET: Vercel Cron runner — validates Authorization: Bearer <CRON_SECRET>
      GET: async ({ request }: { request: Request }) => {
        const cronSecret = process.env.CRON_SECRET?.trim();
        const auth = request.headers.get('authorization');
        if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
          return new Response('Unauthorized', { status: 401 });
        }
        return runScoring();
      },
    },
  },
});
