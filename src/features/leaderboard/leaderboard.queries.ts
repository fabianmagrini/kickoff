import { queryOptions } from '@tanstack/react-query';
import { getLeaderboardFn } from './leaderboard.server';

export const leaderboardQueryOptions = (competitionId: string) =>
  queryOptions({
    queryKey: ['leaderboard', competitionId],
    queryFn: () => getLeaderboardFn({ data: competitionId }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
