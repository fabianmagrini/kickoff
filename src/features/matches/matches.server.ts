import { createServerFn } from '@tanstack/react-start';
import { matchesRepository } from '@/features/matches/matches.repository';
import { logServerFn } from '@/lib/logger';

export const getMatchesFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(({ data: competitionId }) =>
    logServerFn('getMatchesFn', () => matchesRepository.getAll(competitionId)),
  );

export const getMatchByIdFn = createServerFn({ method: 'GET' })
  .inputValidator((matchId: string) => matchId)
  .handler(({ data: matchId }) =>
    logServerFn('getMatchByIdFn', () => matchesRepository.getById(matchId)),
  );
