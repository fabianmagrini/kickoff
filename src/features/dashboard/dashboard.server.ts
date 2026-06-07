import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/auth/auth';
import { dashboardRepository } from './dashboard.repository';
import { logServerFn } from '@/lib/logger';

export const getDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(({ data: competitionId }) =>
    logServerFn('getDashboardFn', async () => {
      const session = await auth.api.getSession({ headers: getRequest().headers });
      return dashboardRepository.get(competitionId, session?.user?.id ?? null);
    }),
  );
