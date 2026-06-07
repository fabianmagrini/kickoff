import { queryOptions } from '@tanstack/react-query';
import { getMyLeaguesFn, getLeagueFn, getLeagueLeaderboardFn } from './leagues.server';

export const myLeaguesQueryOptions = (competitionId: string) =>
  queryOptions({
    queryKey: ['leagues', 'mine', competitionId],
    queryFn: () => getMyLeaguesFn({ data: competitionId }),
    staleTime: 0,
  });

export const leagueQueryOptions = (leagueId: string) =>
  queryOptions({
    queryKey: ['leagues', leagueId],
    queryFn: () => getLeagueFn({ data: leagueId }),
    staleTime: 30 * 1000,
  });

export const leagueLeaderboardQueryOptions = (leagueId: string) =>
  queryOptions({
    queryKey: ['leagues', leagueId, 'leaderboard'],
    queryFn: () => getLeagueLeaderboardFn({ data: leagueId }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
