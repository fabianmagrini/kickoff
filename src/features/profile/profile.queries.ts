import { queryOptions } from '@tanstack/react-query';
import { getProfileFn } from './profile.server';

export const profileQueryOptions = queryOptions({
  queryKey: ['profile'],
  queryFn: () => getProfileFn(),
  staleTime: 30 * 1000,
});
