import { db } from '@/db';
import { aiMatchInsights } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { model } from '@/ai';
import { z } from 'zod';
import { matchesRepository } from '@/features/matches/matches.repository';
import { competitionsRepository } from '@/features/competitions/competitions.repository';

export type AiInsight = typeof aiMatchInsights.$inferSelect;

const insightSchema = z.object({
  predictedWinner: z.string(),
  winProbabilityHome: z.number().min(0).max(100),
  winProbabilityAway: z.number().min(0).max(100),
  winProbabilityDraw: z.number().min(0).max(100),
  tacticalAnalysis: z.string(),
});

// An insight generated before the 24h-before-kickoff window may miss late team news.
function isStale(insight: AiInsight, matchDate: Date): boolean {
  const threshold = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
  return insight.generatedAt < threshold;
}

export const insightsRepository = {
  getCached: async (matchId: string): Promise<AiInsight | null> => {
    const [existing] = await db
      .select()
      .from(aiMatchInsights)
      .where(eq(aiMatchInsights.matchId, matchId));
    return existing ?? null;
  },

  getOrGenerate: async (matchId: string): Promise<AiInsight> => {
    const [cached, match] = await Promise.all([
      insightsRepository.getCached(matchId),
      matchesRepository.getById(matchId),
    ]);

    if (!match) throw new Error('Match not found');

    const stale = cached !== null
      && match.status !== 'completed'
      && isStale(cached, match.matchDate);

    if (cached && !stale) return cached;

    const competition = match.competitionId
      ? await competitionsRepository.getById(match.competitionId)
      : null;
    const competitionName = competition?.name ?? 'the competition';

    const { object: aiResponse } = await generateObject({
      model,
      schema: insightSchema,
      prompt: `Analyze the upcoming ${competitionName} match between ${match.homeTeam} and ${match.awayTeam}.
               Venue: ${match.venue}. Group: ${match.group ?? 'Knockout'}.
               Provide win probabilities for home, away, and draw (must sum to 100),
               predicted winner (or "Draw"), and a concise 3-sentence tactical analysis.`,
    });

    const values = {
      matchId,
      predictedWinner: aiResponse.predictedWinner,
      winProbabilityHome: aiResponse.winProbabilityHome,
      winProbabilityAway: aiResponse.winProbabilityAway,
      winProbabilityDraw: aiResponse.winProbabilityDraw,
      tacticalAnalysis: aiResponse.tacticalAnalysis,
      generatedAt: new Date(),
    };

    const { matchId: _, ...updateFields } = values;

    const [saved] = await db
      .insert(aiMatchInsights)
      .values(values)
      .onConflictDoUpdate({
        target: aiMatchInsights.matchId,
        set: updateFields,
      })
      .returning();

    return saved;
  },
};
