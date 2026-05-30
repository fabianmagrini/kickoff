import { queryOptions } from '@tanstack/react-query';
import { getMatchesFn, getMatchByIdFn } from './matches.server';

export const matchesQueryOptions = queryOptions({
  queryKey: ['matches'],
  queryFn: () => getMatchesFn(),
  staleTime: 5 * 60 * 1000, // 5 minutes — fixture list rarely changes
});

export const matchQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: ['matches', matchId],
    queryFn: () => getMatchByIdFn({ data: matchId }),
    staleTime: 5 * 60 * 1000,
  });
