import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/auth/auth';
import { profileRepository } from './profile.repository';
import { logServerFn } from '@/lib/logger';

/** Returns the authenticated user's profile and full tip history. Requires auth. */
export const getProfileFn = createServerFn({ method: 'GET' })
  .handler(() =>
    logServerFn('getProfileFn', async () => {
      const session = await auth.api.getSession({ headers: getRequest().headers });
      if (!session?.user) throw new Error('Unauthorized');
      const data = await profileRepository.get(session.user.id);
      if (!data) throw new Error('Profile not found');
      return data;
    }),
  );
