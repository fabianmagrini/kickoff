import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each db.select() call pops the next response off the queue.
// Tests push responses in the order the service will request them.
let selectQueue: unknown[] = [];

function makeBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'set', 'innerJoin']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

// update builder is shared but its vi.fn() call history is cleared per test
const updateBuilder = makeBuilder(undefined);

// insert builder for userCompetitionPoints upserts
const insertBuilder = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn(() => Promise.resolve(undefined)),
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeBuilder(selectQueue.shift() ?? [])),
    update: vi.fn(() => updateBuilder),
    insert: vi.fn(() => insertBuilder),
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
import { eq } from 'drizzle-orm';

describe('scoreCompletedMatches', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  it('returns zero counts when no completed matches exist', async () => {
    selectQueue.push([]); // completed matches query → empty
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0, remaining: 0 });
  });

  it('skips completed matches with null scores (data entry lag)', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: null, awayScore: null }]);
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0, remaining: 0 });
  });

  it('skips matches where all tips are already scored', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([]); // unscored tips query → empty
    const result = await scoreCompletedMatches();
    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0, remaining: 0 });
  });

  it('scores an exact prediction with 3 points and updates user total', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '3' }]); // sum for user u1

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1, remaining: 0 });
    expect(eq).toHaveBeenCalledWith(expect.anything(), 't1'); // update targets tip t1
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 3, scoredAt: expect.any(Date) }),
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

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1, remaining: 0 });
    expect(eq).toHaveBeenCalledWith(expect.anything(), 't1'); // update targets tip t1
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 1, scoredAt: expect.any(Date) }),
    );
    expect(updateBuilder.set).toHaveBeenNthCalledWith(2, { points: 1 });
  });

  it('scores a wrong-outcome prediction with 0 points', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 0, awayScore: 2 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '0' }]);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1, remaining: 0 });
    expect(eq).toHaveBeenCalledWith(expect.anything(), 't1'); // update targets tip t1
    expect(updateBuilder.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pointsEarned: 0, scoredAt: expect.any(Date) }),
    );
    expect(updateBuilder.set).toHaveBeenNthCalledWith(2, { points: 0 });
  });

  it('treats an empty sum result as zero points for the user total', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 1, awayScore: 0 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
    ]);
    selectQueue.push([]); // sum query returns no rows — result?.total ?? '0' path

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1, remaining: 0 });
    expect(updateBuilder.set).toHaveBeenNthCalledWith(2, { points: 0 });
  });

  it('updates userCompetitionPoints when match has a competitionId', async () => {
    selectQueue.push([{ id: 'm1', competitionId: 'c1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '3' }]); // global sum
    selectQueue.push([{ total: '3' }]); // competition-scoped sum

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 1, matchesProcessed: 1, remaining: 0 });
    // insert upsert fired once for the one affected user
    expect(insertBuilder.values).toHaveBeenCalledOnce();
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', competitionId: 'c1', points: 3 }),
    );
    expect(insertBuilder.onConflictDoUpdate).toHaveBeenCalledOnce();
  });

  it('skips userCompetitionPoints upsert when match has no competitionId', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    selectQueue.push([{ total: '3' }]); // global sum only

    await scoreCompletedMatches();

    expect(insertBuilder.values).not.toHaveBeenCalled();
  });

  it('counts matchesProcessed per match, not per tip', async () => {
    selectQueue.push([{ id: 'm1', status: 'completed', homeScore: 1, awayScore: 0 }]);
    selectQueue.push([
      { id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 },
      { id: 't2', userId: 'u2', matchId: 'm1', predictedHomeScore: 0, predictedAwayScore: 1, pointsEarned: 0 },
    ]);
    // Use the same total for both users so Set iteration order doesn't affect correctness.
    // Per-user point accuracy is covered by the single-user happy-path tests.
    selectQueue.push([{ total: '1' }]);
    selectQueue.push([{ total: '1' }]);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 2, matchesProcessed: 1, remaining: 0 });
    // 2 tip updates + 2 user-total updates = 4 set() calls
    expect(updateBuilder.set).toHaveBeenCalledTimes(4);
    // Both users had their point totals updated (calls 3 and 4)
    expect(updateBuilder.set).toHaveBeenNthCalledWith(3, { points: 1 });
    expect(updateBuilder.set).toHaveBeenNthCalledWith(4, { points: 1 });
  });

  it('processes only chunkSize matches and reports remaining', async () => {
    // 3 matches with unscored tips, chunkSize = 2
    selectQueue.push([
      { id: 'm1', status: 'completed', homeScore: 1, awayScore: 0 },
      { id: 'm2', status: 'completed', homeScore: 2, awayScore: 1 },
      { id: 'm3', status: 'completed', homeScore: 0, awayScore: 0 },
    ]);
    // m1 tips + sum
    selectQueue.push([{ id: 't1', userId: 'u1', matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: 0, pointsEarned: 0 }]);
    selectQueue.push([{ total: '1' }]);
    // m2 tips + sum
    selectQueue.push([{ id: 't2', userId: 'u1', matchId: 'm2', predictedHomeScore: 2, predictedAwayScore: 1, pointsEarned: 0 }]);
    selectQueue.push([{ total: '4' }]);
    // m3 tips query (reached before chunk check? No — chunk check runs after unscoredTips check)
    selectQueue.push([{ id: 't3', userId: 'u1', matchId: 'm3', predictedHomeScore: 0, predictedAwayScore: 0, pointsEarned: 0 }]);

    const result = await scoreCompletedMatches(2);

    expect(result).toEqual({ tipsScored: 2, matchesProcessed: 2, remaining: 1 });
  });
});
