import { db } from '@/db';
import { tips, matches, users, userCompetitionPoints } from '@/db/schema';
import { eq, isNull, isNotNull, and, sum } from 'drizzle-orm';
import { calculatePoints } from '@/features/tips/scoring';

export type ScoringResult = {
  tipsScored: number;
  matchesProcessed: number;
  /** Completed matches with unscored tips that were not reached this run. Re-invoke to continue. */
  remaining: number;
};

/**
 * Score unscored tips for completed matches, up to chunkSize matches per call.
 * Safe to run multiple times — tips with scoredAt set are skipped.
 * When remaining > 0, invoke again immediately to process the next chunk.
 * Updates both users.points (global total) and userCompetitionPoints (per-competition).
 */
export async function scoreCompletedMatches(chunkSize = 10): Promise<ScoringResult> {
  const completedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, 'completed'));

  let tipsScored = 0;
  let matchesProcessed = 0;
  let remaining = 0;

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

    // Chunk limit reached — count remaining matches but don't process them
    if (matchesProcessed >= chunkSize) {
      remaining++;
      continue;
    }

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

    for (const userId of affectedUserIds) {
      const [globalResult] = await db
        .select({ total: sum(tips.pointsEarned) })
        .from(tips)
        .where(and(eq(tips.userId, userId), isNotNull(tips.scoredAt)));

      const globalPoints = Number(globalResult?.total ?? '0');

      await db
        .update(users)
        .set({ points: globalPoints })
        .where(eq(users.id, userId));

      if (match.competitionId) {
        const [compResult] = await db
          .select({ total: sum(tips.pointsEarned) })
          .from(tips)
          .innerJoin(matches, eq(tips.matchId, matches.id))
          .where(
            and(
              eq(tips.userId, userId),
              eq(matches.competitionId, match.competitionId),
              isNotNull(tips.scoredAt),
            ),
          );

        const compPoints = Number(compResult?.total ?? '0');

        await db
          .insert(userCompetitionPoints)
          .values({ userId, competitionId: match.competitionId, points: compPoints })
          .onConflictDoUpdate({
            target: [userCompetitionPoints.userId, userCompetitionPoints.competitionId],
            set: { points: compPoints },
          });
      }
    }
  }

  return { tipsScored, matchesProcessed, remaining };
}
