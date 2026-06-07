import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/auth/auth';
import { insightsRepository } from '@/features/insights/insights.repository';

// In-process per-user+per-match cooldown (resets on server restart).
// Prevents rapid repeated LLM calls before the DB cache is populated.
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export const getCachedInsightFn = createServerFn({ method: 'GET' })
  .inputValidator((matchId: string) => matchId)
  .handler(({ data: matchId }) => insightsRepository.getCached(matchId));

/** Generates (or returns cached) AI insight for a match. Requires auth; rate-limited to one call per user per match per 60 s. */
export const getOrGenerateInsightFn = createServerFn({ method: 'POST' })
  .inputValidator((matchId: string) => matchId)
  .handler(async ({ data: matchId }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers });
    if (!session?.user) throw new Error('Unauthorized');

    const key = `${session.user.id}:${matchId}`;
    const last = cooldowns.get(key);
    if (last && Date.now() - last < COOLDOWN_MS) {
      throw new Error('Please wait 60 seconds before requesting another insight for this match.');
    }

    cooldowns.set(key, Date.now());
    return insightsRepository.getOrGenerate(matchId);
  });
