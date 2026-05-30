import { queryOptions } from '@tanstack/react-query';
import { getLeaderboardFn } from './leaderboard.server';

export const leaderboardQueryOptions = queryOptions({
  queryKey: ['leaderboard'],
  queryFn: () => getLeaderboardFn(),
  staleTime: 30 * 1000, // 30 seconds — rankings shift frequently during tournament
  refetchInterval: 60 * 1000, // auto-refresh every minute while tab is open
});
