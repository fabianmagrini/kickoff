import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/auth/auth';
import { profileRepository } from './profile.repository';

export const getProfileFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session?.user) throw new Error('Unauthorized');
  return profileRepository.get(session.user.id);
});
