import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each db.select() call pops the next response off the queue.
// Tests push responses in the order the service will request them.
let selectQueue: unknown[] = [];

function makeBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'set']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

// update builder is shared but its vi.fn() call history is cleared per test
const updateBuilder = makeBuilder(undefined);

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeBuilder(selectQueue.shift() ?? [])),
    update: vi.fn(() => updateBuilder),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  isNull: vi.fn(() => 'isNull'),
  isNotNull: vi.fn(() => 'isNotNull'),
  and: vi.fn(() => 'and'),
  sum: vi.fn(() => 'sum'),
}));

import { scoreCompletedMatches } from './scoring.service';

describe('scoreCompletedMatches', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  it('returns zero counts when no completed matches exist', async () => {
    selectQueue.push([]); // completed matches query → empty
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });

  it('skips completed matches with null scores (data entry lag)', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: null, awayScore: null }]);
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });

  it('skips matches where all tips are already scored', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([]); // unscored tips query → empty
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });

  it('scores an exact prediction with 3 points and updates user total', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '3' }]); // sum for user u1

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1 });
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 3 }),
    );
    expect(updateBuilder.set).toHaveBeenNthCalledWith(2, { points: 3 });
  });

  it('scores a correct-outcome wrong-score prediction with 1 point', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 3, awayScore: 0 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '1' }]);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1 });
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 1 }),
    );
  });

  it('scores a wrong-outcome prediction with 0 points', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 0, awayScore: 2 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '0' }]);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1 });
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 0 }),
    );
    expect(updateBuilder.set).toHaveBeenNthCalledWith(2, { points: 0 });
  });

  it('counts matchesProcessed per match, not per tip', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 1, awayScore: 0 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
      { id: 't2', userId: 'u2', matchId: 'm1', predictedHomeScore: 0, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    // two users → two sum queries
    selectQueue.push([{ total: '3' }]);
    selectQueue.push([{ total: '0' }]);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 2, matchesProcessed: 1 });
  });
});
