import { db } from '@/db';
import { users, userCompetitionPoints } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export type LeaderboardEntry = { id: string; name: string; points: number };

export const leaderboardRepository = {
  getTopN: async (competitionId: string, limit = 50): Promise<LeaderboardEntry[]> =>
    db
      .select({ id: users.id, name: users.name, points: userCompetitionPoints.points })
      .from(userCompetitionPoints)
      .innerJoin(users, eq(userCompetitionPoints.userId, users.id))
      .where(eq(userCompetitionPoints.competitionId, competitionId))
      .orderBy(desc(userCompetitionPoints.points))
      .limit(limit),
};
