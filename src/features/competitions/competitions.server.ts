import { createServerFn } from '@tanstack/react-start';
import { competitionsRepository } from './competitions.repository';
import { logServerFn } from '@/lib/logger';

/** Returns all competitions ordered by start date descending. */
export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .handler(() => logServerFn('getCompetitionsFn', () => competitionsRepository.getAll()));

/** Returns a single competition by ID, or throws if not found. */
export const getCompetitionFn = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(({ data: id }) =>
    logServerFn('getCompetitionFn', async () => {
      const competition = await competitionsRepository.getById(id);
      if (!competition) throw new Error('Competition not found');
      return competition;
    }),
  );

/** Returns all competitions with status = active. */
export const getActiveCompetitionsFn = createServerFn({ method: 'GET' })
  .handler(() => logServerFn('getActiveCompetitionsFn', () => competitionsRepository.getActive()));
