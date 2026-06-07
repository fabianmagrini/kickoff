import { queryOptions } from '@tanstack/react-query';
import { getDashboardFn } from './dashboard.server';

export const dashboardQueryOptions = (competitionId: string) =>
  queryOptions({
    queryKey: ['dashboard', competitionId],
    queryFn: () => getDashboardFn({ data: competitionId }),
    staleTime: 30 * 1000,
  });
