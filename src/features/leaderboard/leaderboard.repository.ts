import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export type LeaderboardEntry = { id: string; name: string; points: number };

export const leaderboardRepository = {
  getTopN: async (limit = 50): Promise<LeaderboardEntry[]> =>
    db
      .select({ id: users.id, name: users.name, points: users.points })
      .from(users)
      .orderBy(desc(users.points))
      .limit(limit),
};
