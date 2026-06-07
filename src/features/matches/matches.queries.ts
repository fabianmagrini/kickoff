import { queryOptions } from '@tanstack/react-query';
import { getMatchesFn, getMatchByIdFn } from './matches.server';

export const matchesQueryOptions = (competitionId: string) =>
  queryOptions({
    queryKey: ['matches', competitionId],
    queryFn: () => getMatchesFn({ data: competitionId }),
    staleTime: 5 * 60 * 1000,
  });

export const matchQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: ['matches', matchId],
    queryFn: () => getMatchByIdFn({ data: matchId }),
    staleTime: 5 * 60 * 1000,
  });
