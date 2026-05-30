import { createServerFn } from '@tanstack/react-start';
import { matchesRepository } from '@/features/matches/matches.repository';

export const getMatchesFn = createServerFn({ method: 'GET' })
  .handler(() => matchesRepository.getAll());

export const getMatchByIdFn = createServerFn({ method: 'GET' })
  .inputValidator((matchId: string) => matchId)
  .handler(({ data: matchId }) => matchesRepository.getById(matchId));
