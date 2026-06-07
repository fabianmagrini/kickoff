import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { auth } from '@/auth/auth';
import { dashboardRepository } from './dashboard.repository';

export const getDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(async ({ data: competitionId }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers });
    return dashboardRepository.get(competitionId, session?.user?.id ?? null);
  });
