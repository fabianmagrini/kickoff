import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectQueue: unknown[] = [];
let insertQueue: unknown[] = [];

function makeSelectBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

function makeInsertBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  builder.values = vi.fn(() => builder);
  builder.onConflictDoUpdate = vi.fn(() => builder);
  builder.returning = vi.fn(() => builder);
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeSelectBuilder(selectQueue.shift() ?? [])),
    insert: vi.fn(() => makeInsertBuilder(insertQueue.shift() ?? [])),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
}));

vi.mock('@/ai', () => ({
  model: {},
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@/features/matches/matches.repository', () => ({
  matchesRepository: {
    getById: vi.fn(),
  },
}));

import { insightsRepository } from './insights.repository';
import { generateObject } from 'ai';
import { matchesRepository } from '@/features/matches/matches.repository';

// NOW = June 10, 12:00 UTC
// MATCH_DATE = 18h from now — threshold (matchDate - 24h) = 6h ago (06:00)
// INSIGHT_ROW.generatedAt = 2h ago (10:00) — AFTER threshold → fresh
// staleInsight.generatedAt = 8h ago (04:00) — BEFORE threshold → stale
const NOW = new Date('2026-06-10T12:00:00Z');
const h = (n: number) => n * 60 * 60 * 1000;
const MATCH_DATE = new Date(NOW.getTime() + h(18));  // Jun 10 06:00 threshold
const THRESHOLD = new Date(MATCH_DATE.getTime() - h(24)); // Jun 10 06:00

const INSIGHT_ROW = {
  matchId: 'm1',
  predictedWinner: 'Brazil',
  winProbabilityHome: 60,
  winProbabilityAway: 20,
  winProbabilityDraw: 20,
  tacticalAnalysis: 'Brazil dominates midfield.',
  generatedAt: new Date(NOW.getTime() - h(2)),  // 10:00 — fresh (after threshold)
};

const MATCH_ROW = {
  id: 'm1',
  homeTeam: 'Brazil',
  awayTeam: 'Germany',
  venue: 'Maracanã',
  group: 'A',
  status: 'scheduled',
  matchDate: MATCH_DATE,
  homeScore: null,
  awayScore: null,
};

describe('insightsRepository', () => {
  beforeEach(() => {
    selectQueue = [];
    insertQueue = [];
    vi.clearAllMocks();
  });

  describe('getCached', () => {
    it('returns the cached insight when one exists', async () => {
      selectQueue.push([INSIGHT_ROW]);
      expect(await insightsRepository.getCached('m1')).toEqual(INSIGHT_ROW);
    });

    it('returns null on a cache miss', async () => {
      selectQueue.push([]);
      expect(await insightsRepository.getCached('m1')).toBeNull();
    });
  });

  describe('getOrGenerate', () => {
    it('returns the cached insight and skips the LLM on a fresh cache hit', async () => {
      // generatedAt (10:00) is after threshold (06:00) → not stale
      selectQueue.push([INSIGHT_ROW]);
      vi.mocked(matchesRepository.getById).mockResolvedValue(MATCH_ROW as any);

      const result = await insightsRepository.getOrGenerate('m1');

      expect(result).toEqual(INSIGHT_ROW);
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('throws when the match does not exist on a cache miss', async () => {
      selectQueue.push([]); // getCached → miss
      vi.mocked(matchesRepository.getById).mockResolvedValue(null);

      await expect(insightsRepository.getOrGenerate('m1')).rejects.toThrow('Match not found');
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('calls the LLM, writes to DB, and returns the saved insight on a cache miss', async () => {
      selectQueue.push([]); // getCached → miss
      vi.mocked(matchesRepository.getById).mockResolvedValue(MATCH_ROW as any);
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          predictedWinner: INSIGHT_ROW.predictedWinner,
          winProbabilityHome: INSIGHT_ROW.winProbabilityHome,
          winProbabilityAway: INSIGHT_ROW.winProbabilityAway,
          winProbabilityDraw: INSIGHT_ROW.winProbabilityDraw,
          tacticalAnalysis: INSIGHT_ROW.tacticalAnalysis,
        },
      } as any);
      insertQueue.push([INSIGHT_ROW]);

      const result = await insightsRepository.getOrGenerate('m1');

      expect(generateObject).toHaveBeenCalledOnce();
      expect(result).toEqual(INSIGHT_ROW);
    });

    it('includes match teams and venue in the LLM prompt', async () => {
      selectQueue.push([]);
      vi.mocked(matchesRepository.getById).mockResolvedValue(MATCH_ROW as any);
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          predictedWinner: 'Brazil',
          winProbabilityHome: 60,
          winProbabilityAway: 20,
          winProbabilityDraw: 20,
          tacticalAnalysis: 'Test.',
        },
      } as any);
      insertQueue.push([INSIGHT_ROW]);

      await insightsRepository.getOrGenerate('m1');

      const call = vi.mocked(generateObject).mock.calls[0][0] as { prompt: string };
      expect(call.prompt).toContain('Brazil');
      expect(call.prompt).toContain('Germany');
      expect(call.prompt).toContain('Maracanã');
    });

    it('regenerates a stale insight and overwrites the cached row', async () => {
      // generatedAt (04:00) is before threshold (06:00) → stale
      const staleInsight = {
        ...INSIGHT_ROW,
        generatedAt: new Date(NOW.getTime() - h(8)),
      };
      const freshInsight = { ...INSIGHT_ROW, generatedAt: new Date() };

      selectQueue.push([staleInsight]); // getCached → stale hit
      vi.mocked(matchesRepository.getById).mockResolvedValue(MATCH_ROW as any);
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          predictedWinner: freshInsight.predictedWinner,
          winProbabilityHome: freshInsight.winProbabilityHome,
          winProbabilityAway: freshInsight.winProbabilityAway,
          winProbabilityDraw: freshInsight.winProbabilityDraw,
          tacticalAnalysis: freshInsight.tacticalAnalysis,
        },
      } as any);
      insertQueue.push([freshInsight]);

      const result = await insightsRepository.getOrGenerate('m1');

      expect(generateObject).toHaveBeenCalledOnce();
      expect(result).toEqual(freshInsight);
    });

    it('does not regenerate a stale insight for a completed match', async () => {
      // Even if the insight would be stale by timestamp, completed matches must not trigger regeneration
      const staleInsight = {
        ...INSIGHT_ROW,
        generatedAt: new Date(NOW.getTime() - h(8)),
      };
      const completedMatch = { ...MATCH_ROW, status: 'completed' };

      selectQueue.push([staleInsight]);
      vi.mocked(matchesRepository.getById).mockResolvedValue(completedMatch as any);

      const result = await insightsRepository.getOrGenerate('m1');

      expect(generateObject).not.toHaveBeenCalled();
      expect(result).toEqual(staleInsight);
    });

    it('treats an insight generated exactly at the threshold boundary as fresh (isStale uses strict <)', async () => {
      // generatedAt === THRESHOLD → not stale (boundary is exclusive)
      const boundaryInsight = { ...INSIGHT_ROW, generatedAt: THRESHOLD };
      selectQueue.push([boundaryInsight]);
      vi.mocked(matchesRepository.getById).mockResolvedValue(MATCH_ROW as any);

      const result = await insightsRepository.getOrGenerate('m1');

      expect(generateObject).not.toHaveBeenCalled();
      expect(result).toEqual(boundaryInsight);
    });
  });

  it('fixture sanity: INSIGHT_ROW.generatedAt must be at or after the staleness threshold', () => {
    expect(INSIGHT_ROW.generatedAt.getTime()).toBeGreaterThanOrEqual(THRESHOLD.getTime());
  });
});
