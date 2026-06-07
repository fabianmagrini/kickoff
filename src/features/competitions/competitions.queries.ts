import { queryOptions } from '@tanstack/react-query';
import { getCompetitionsFn, getCompetitionFn, getActiveCompetitionsFn } from './competitions.server';

export const competitionsQueryOptions = queryOptions({
  queryKey: ['competitions'],
  queryFn: () => getCompetitionsFn(),
  staleTime: 5 * 60 * 1000, // competitions change rarely
});

export const competitionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['competitions', id],
    queryFn: () => getCompetitionFn({ data: id }),
    staleTime: 5 * 60 * 1000,
  });

export const activeCompetitionsQueryOptions = queryOptions({
  queryKey: ['competitions', 'active'],
  queryFn: () => getActiveCompetitionsFn(),
  staleTime: 60 * 1000,
});
