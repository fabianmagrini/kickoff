import { createFileRoute } from '@tanstack/react-router';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';

export const Route = createFileRoute('/api/cron/score')({
  // @ts-expect-error - server handler type
  handler: async ({ request }: { request: Request }) => {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const secret = request.headers.get('x-cron-secret');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await scoreCompletedMatches();
    return Response.json(result);
  },
});
