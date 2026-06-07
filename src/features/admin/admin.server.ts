import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { auth } from '@/auth/auth';
import { adminRepository } from './admin.repository';
import { logServerFn } from '@/lib/logger';

function isAdmin(userId: string): boolean {
  const ids = process.env.ADMIN_USER_IDS ?? '';
  return ids.split(',').map((s) => s.trim()).filter(Boolean).includes(userId);
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session?.user) throw new Error('Unauthorized');
  if (!isAdmin(session.user.id)) throw new Error('Forbidden');
  return session.user;
}

/** Throws if the caller is not an authenticated admin. */
export const checkIsAdminFn = createServerFn({ method: 'GET' })
  .handler(() => logServerFn('checkIsAdminFn', () => requireAdmin()));

const updateMatchSchema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99).nullable(),
  awayScore: z.number().int().min(0).max(99).nullable(),
  status: z.enum(['scheduled', 'live', 'completed']),
});

/** Update a match result and trigger re-scoring if completed. Requires admin. */
export const updateMatchFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => updateMatchSchema.parse(data))
  .handler(({ data }) =>
    logServerFn('updateMatchFn', async () => {
      await requireAdmin();
      const { matchId, ...update } = data;
      return adminRepository.updateMatch(matchId, update);
    }),
  );
