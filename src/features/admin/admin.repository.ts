import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';
import type { Match } from '@/features/matches/matches.repository';

export type MatchUpdate = {
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'completed';
};

export const adminRepository = {
  updateMatch: async (id: string, update: MatchUpdate): Promise<Match> => {
    const [match] = await db
      .update(matches)
      .set(update)
      .where(eq(matches.id, id))
      .returning();
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') {
      await scoreCompletedMatches();
    }
    return match;
  },
};
