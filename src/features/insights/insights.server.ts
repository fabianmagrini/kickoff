import { createServerFn } from '@tanstack/react-start';
import { insightsRepository } from '@/features/insights/insights.repository';

export const getCachedInsightFn = createServerFn({ method: 'GET' })
  .inputValidator((matchId: string) => matchId)
  .handler(({ data: matchId }) => insightsRepository.getCached(matchId));

export const getOrGenerateInsightFn = createServerFn({ method: 'POST' })
  .inputValidator((matchId: string) => matchId)
  .handler(({ data: matchId }) => insightsRepository.getOrGenerate(matchId));
