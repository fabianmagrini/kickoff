import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/auth/auth';
import { dashboardRepository } from './dashboard.repository';

export const getDashboardFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  return dashboardRepository.get(session?.user?.id ?? null);
});
