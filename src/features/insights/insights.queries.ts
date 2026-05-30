import { queryOptions } from '@tanstack/react-query';
import { getCachedInsightFn } from './insights.server';

export const insightQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: ['insights', matchId],
    queryFn: () => getCachedInsightFn({ data: matchId }),
    staleTime: Infinity, // AI insights are immutable once generated
  });
