import { db } from '@/db';
import { tips, matches, users } from '@/db/schema';
import { eq, isNull, isNotNull, and, sum } from 'drizzle-orm';
import { calculatePoints } from '@/features/tips/scoring';

export type ScoringResult = {
  tipsScored: number;
  matchesProcessed: number;
};

/**
 * Score all unscored tips for completed matches and update user point totals.
 * Safe to run multiple times — tips with scoredAt set are skipped.
 * Processes each match sequentially; partial runs are recoverable on the next call.
 */
export async function scoreCompletedMatches(): Promise<ScoringResult> {
  const completedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, 'completed'));

  let tipsScored = 0;
  let matchesProcessed = 0;

  for (const match of completedMatches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const unscoredTips = await db
      .select()
      .from(tips)
      .where(and(
        eq(tips.matchId, match.id),
        isNull(tips.scoredAt),
      ));

    if (unscoredTips.length === 0) continue;

    const now = new Date();
    const affectedUserIds = new Set<string>();

    for (const tip of unscoredTips) {
      const points = calculatePoints(
        tip.predictedHomeScore,
        tip.predictedAwayScore,
        match.homeScore,
        match.awayScore,
      );

      await db
        .update(tips)
        .set({ pointsEarned: points, scoredAt: now })
        .where(eq(tips.id, tip.id));

      affectedUserIds.add(tip.userId);
    }

    tipsScored += unscoredTips.length;
    matchesProcessed++;

    // Recalculate total points for each affected user from all their scored tips
    for (const userId of affectedUserIds) {
      const [result] = await db
        .select({ total: sum(tips.pointsEarned) })
        .from(tips)
        .where(and(
          eq(tips.userId, userId),
          isNotNull(tips.scoredAt),
        ));

      await db
        .update(users)
        .set({ points: Number(result?.total ?? '0') })
        .where(eq(users.id, userId));
    }
  }

  return { tipsScored, matchesProcessed };
}
