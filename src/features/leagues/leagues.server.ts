import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { auth } from '@/auth/auth';
import { leaguesRepository } from './leagues.repository';

async function requireAuth() {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session?.user) throw new Error('Unauthorized');
  return session.user;
}

/** Returns all leagues the authenticated user belongs to. Requires auth. */
export const getMyLeaguesFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const user = await requireAuth();
    return leaguesRepository.getMyLeagues(user.id);
  });

/** Returns league detail for a member. Throws if user is not a member. Requires auth. */
export const getLeagueFn = createServerFn({ method: 'GET' })
  .inputValidator((leagueId: string) => leagueId)
  .handler(async ({ data: leagueId }) => {
    const user = await requireAuth();
    const league = await leaguesRepository.getById(leagueId, user.id);
    if (!league) throw new Error('League not found');
    return league;
  });

/** Returns the scoped leaderboard for a league. Throws if user is not a member. Requires auth. */
export const getLeagueLeaderboardFn = createServerFn({ method: 'GET' })
  .inputValidator((leagueId: string) => leagueId)
  .handler(async ({ data: leagueId }) => {
    const user = await requireAuth();
    const league = await leaguesRepository.getById(leagueId, user.id);
    if (!league) throw new Error('League not found');
    return leaguesRepository.getLeaderboard(leagueId);
  });

/** Creates a new league and adds the creator as the first member. Requires auth. */
export const createLeagueFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) =>
    z.object({ name: z.string().min(1).max(50) }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    return leaguesRepository.create(data.name, user.id);
  });

/** Joins a league by invite code. Throws if code is invalid or user is already a member. Requires auth. */
export const joinLeagueFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) =>
    z.object({ inviteCode: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    return leaguesRepository.joinByCode(data.inviteCode, user.id);
  });
