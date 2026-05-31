import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectQueue: unknown[] = [];

function makeBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'innerJoin']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

vi.mock('@/db', () => ({
  db: { select: vi.fn(() => makeBuilder(selectQueue.shift() ?? [])) },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  gt: vi.fn(() => 'gt'),
  sql: vi.fn(() => 'sql'),
}));

import { profileRepository } from './profile.repository';

const TIP_ROW = {
  id: 't1', matchId: 'm1', homeTeam: 'Brazil', awayTeam: 'Argentina',
  matchDate: new Date('2026-06-15'), group: 'A',
  predictedHomeScore: 2, predictedAwayScore: 1,
  pointsEarned: 3, scoredAt: new Date('2026-06-15T22:00:00Z'),
  matchStatus: 'completed', homeScore: 2, awayScore: 1,
};

describe('profileRepository.get', () => {
  beforeEach(() => { selectQueue = []; vi.clearAllMocks(); });

  it('returns null when the user row does not exist', async () => {
    selectQueue.push([]); // user query → empty
    expect(await profileRepository.get('unknown')).toBeNull();
  });

  it('returns full profile data with tips and rank', async () => {
    // Sequential: user query → await, then Promise.all([rankQuery, tipsQuery]).
    // db.select() for rank fires before db.select() for tips inside Promise.all.
    selectQueue.push([{ name: 'Alice', email: 'alice@example.com', points: 10 }]); // user
    selectQueue.push([{ rank: 2 }]);  // rank (Promise.all, first expression)
    selectQueue.push([TIP_ROW]);       // tips (Promise.all, second expression)

    const result = await profileRepository.get('u1');

    expect(result).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      points: 10,
      rank: 2,
      totalTips: 1,
      tips: [TIP_ROW],
    });
  });

  it('returns an empty tips list when the user has made no tips', async () => {
    selectQueue.push([{ name: 'Bob', email: 'bob@example.com', points: 0 }]);
    selectQueue.push([{ rank: 1 }]);
    selectQueue.push([]);

    const result = await profileRepository.get('u2');

    expect(result?.totalTips).toBe(0);
    expect(result?.tips).toEqual([]);
  });

  it('gives rank 1 to the sole leader', async () => {
    selectQueue.push([{ name: 'Alice', email: 'alice@example.com', points: 20 }]);
    selectQueue.push([{ rank: 1 }]); // count(*) + 1 = 0 + 1 = 1
    selectQueue.push([]);

    const result = await profileRepository.get('u1');

    expect(result?.rank).toBe(1);
  });
});
