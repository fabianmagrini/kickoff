import { queryOptions } from '@tanstack/react-query';
import { getUserTipFn } from './tips.server';

export const userTipQueryOptions = (matchId: string) =>
  queryOptions({
    queryKey: ['tips', 'user', matchId],
    queryFn: () => getUserTipFn({ data: matchId }),
    staleTime: 0, // always revalidate — tip changes on submission
  });
