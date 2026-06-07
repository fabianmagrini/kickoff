import { createServerFn } from '@tanstack/react-start';
import { competitionsRepository } from './competitions.repository';

/** Returns all competitions ordered by start date descending. */
export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .handler(() => competitionsRepository.getAll());

/** Returns a single competition by ID, or throws if not found. */
export const getCompetitionFn = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const competition = await competitionsRepository.getById(id);
    if (!competition) throw new Error('Competition not found');
    return competition;
  });

/** Returns all competitions with status = active. */
export const getActiveCompetitionsFn = createServerFn({ method: 'GET' })
  .handler(() => competitionsRepository.getActive());
