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

const INSIGHT_ROW = {
  matchId: 'm1',
  predictedWinner: 'Brazil',
  winProbabilityHome: 60,
  winProbabilityAway: 20,
  winProbabilityDraw: 20,
  tacticalAnalysis: 'Brazil dominates midfield.',
};

const MATCH_ROW = {
  id: 'm1',
  homeTeam: 'Brazil',
  awayTeam: 'Germany',
  venue: 'Maracanã',
  group: 'A',
  status: 'scheduled',
  matchDate: new Date(),
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
    it('returns the cached insight and skips the LLM on a cache hit', async () => {
      selectQueue.push([INSIGHT_ROW]);
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
  });
});
