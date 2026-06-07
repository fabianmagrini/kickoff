import { db } from '@/db';
import { matches } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

export type Match = typeof matches.$inferSelect;

export const matchesRepository = {
  getAll: async (competitionId: string): Promise<Match[]> =>
    db
      .select()
      .from(matches)
      .where(eq(matches.competitionId, competitionId))
      .orderBy(asc(matches.matchDate)),

  getById: async (id: string): Promise<Match | null> => {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match ?? null;
  },
};
