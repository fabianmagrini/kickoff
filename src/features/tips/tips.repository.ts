import { db } from '@/db';
import { tips } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export type Tip = typeof tips.$inferSelect;

export type NewTip = {
  userId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
};

export const tipsRepository = {
  submit: async (data: NewTip): Promise<{ tipId: string }> => {
    const [inserted] = await db
      .insert(tips)
      .values({
        userId: data.userId,
        matchId: data.matchId,
        predictedHomeScore: data.predictedHomeScore,
        predictedAwayScore: data.predictedAwayScore,
      })
      .returning();
    return { tipId: inserted.id };
  },

  getUserTip: async (userId: string, matchId: string): Promise<Tip | null> => {
    const [tip] = await db
      .select()
      .from(tips)
      .where(and(eq(tips.userId, userId), eq(tips.matchId, matchId)));
    return tip ?? null;
  },
};
