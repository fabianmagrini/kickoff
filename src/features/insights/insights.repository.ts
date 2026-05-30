import { db } from '@/db';
import { aiMatchInsights } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { model } from '@/ai';
import { z } from 'zod';
import { matchesRepository } from '@/features/matches/matches.repository';

export type AiInsight = typeof aiMatchInsights.$inferSelect;

const insightSchema = z.object({
  predictedWinner: z.string(),
  winProbabilityHome: z.number().min(0).max(100),
  winProbabilityAway: z.number().min(0).max(100),
  winProbabilityDraw: z.number().min(0).max(100),
  tacticalAnalysis: z.string(),
});

export const insightsRepository = {
  getCached: async (matchId: string): Promise<AiInsight | null> => {
    const [existing] = await db
      .select()
      .from(aiMatchInsights)
      .where(eq(aiMatchInsights.matchId, matchId));
    return existing ?? null;
  },

  getOrGenerate: async (matchId: string): Promise<AiInsight> => {
    const cached = await insightsRepository.getCached(matchId);
    if (cached) return cached;

    const match = await matchesRepository.getById(matchId);
    if (!match) throw new Error('Match not found');

    const { object: aiResponse } = await generateObject({
      model,
      schema: insightSchema,
      prompt: `Analyze the upcoming World Cup 2026 match between ${match.homeTeam} and ${match.awayTeam}.
               Venue: ${match.venue}. Group: ${match.group ?? 'Knockout'}.
               Provide win probabilities for home, away, and draw (must sum to 100),
               predicted winner (or "Draw"), and a concise 3-sentence tactical analysis.`,
    });

    const [saved] = await db.insert(aiMatchInsights).values({
      matchId,
      predictedWinner: aiResponse.predictedWinner,
      winProbabilityHome: aiResponse.winProbabilityHome,
      winProbabilityAway: aiResponse.winProbabilityAway,
      winProbabilityDraw: aiResponse.winProbabilityDraw,
      tacticalAnalysis: aiResponse.tacticalAnalysis,
    }).returning();

    return saved;
  },
};
