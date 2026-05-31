import { queryOptions } from '@tanstack/react-query';
import { getDashboardFn } from './dashboard.server';

export const dashboardQueryOptions = queryOptions({
  queryKey: ['dashboard'],
  queryFn: () => getDashboardFn(),
  staleTime: 30 * 1000,
});
