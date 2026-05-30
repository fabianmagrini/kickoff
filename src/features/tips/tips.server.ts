import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { auth } from '@/auth/auth';
import { tipsRepository } from '@/features/tips/tips.repository';
import { matchesRepository } from '@/features/matches/matches.repository';

const submitTipSchema = z.object({
  matchId: z.string().uuid(),
  predictedHomeScore: z.number().int().min(0).max(20),
  predictedAwayScore: z.number().int().min(0).max(20),
});

export const submitTipFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => submitTipSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers });
    if (!session?.user) throw new Error('Unauthorized');

    const match = await matchesRepository.getById(data.matchId);
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Tipping is closed for this match');

    return tipsRepository.submit({
      userId: session.user.id,
      matchId: data.matchId,
      predictedHomeScore: data.predictedHomeScore,
      predictedAwayScore: data.predictedAwayScore,
    });
  });

export const getUserTipFn = createServerFn({ method: 'GET' })
  .inputValidator((matchId: string) => matchId)
  .handler(async ({ data: matchId }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers });
    return {
      isAuthenticated: !!session?.user,
      tip: session?.user
        ? await tipsRepository.getUserTip(session.user.id, matchId)
        : null,
    };
  });
