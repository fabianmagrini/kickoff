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
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(() => 'eq'),
  gt: vi.fn(() => 'gt'),
  ne: vi.fn(() => 'ne'),
  and: vi.fn(() => 'and'),
  sql: vi.fn(() => 'sql'),
}));

import { dashboardRepository } from './dashboard.repository';

const CID = 'comp-1';

const UPCOMING_MATCH = {
  id: 'm1', homeTeam: 'Brazil', awayTeam: 'Argentina',
  matchDate: new Date('2026-06-15'), group: 'A', venue: 'Estadio Azteca',
};

const RECENT_TIP = {
  id: 't1', matchId: 'm1', homeTeam: 'Brazil', awayTeam: 'Argentina',
  matchDate: new Date('2026-06-10'), predictedHomeScore: 2, predictedAwayScore: 1,
  pointsEarned: 3, matchStatus: 'completed', homeScore: 2, awayScore: 1,
};

describe('dashboardRepository.getUpcomingMatches', () => {
  beforeEach(() => { selectQueue = []; vi.clearAllMocks(); });

  it('returns an empty array when no non-completed matches exist', async () => {
    selectQueue.push([]);
    expect(await dashboardRepository.getUpcomingMatches(CID)).toEqual([]);
  });

  it('returns upcoming match rows from the DB', async () => {
    selectQueue.push([UPCOMING_MATCH]);
    expect(await dashboardRepository.getUpcomingMatches(CID)).toEqual([UPCOMING_MATCH]);
  });
});

describe('dashboardRepository.getRecentTips', () => {
  beforeEach(() => { selectQueue = []; vi.clearAllMocks(); });

  it('returns an empty array when the user has no tips', async () => {
    selectQueue.push([]);
    expect(await dashboardRepository.getRecentTips('u1', CID)).toEqual([]);
  });

  it('returns tip rows with joined match data', async () => {
    selectQueue.push([RECENT_TIP]);
    expect(await dashboardRepository.getRecentTips('u1', CID)).toEqual([RECENT_TIP]);
  });
});

describe('dashboardRepository.getUserStats', () => {
  beforeEach(() => { selectQueue = []; vi.clearAllMocks(); });

  it('returns null when the user row does not exist', async () => {
    selectQueue.push([]); // user query → empty
    expect(await dashboardRepository.getUserStats('unknown', CID)).toBeNull();
  });

  it('returns stats with rank and tip count for an existing user', async () => {
    // Sequential selects: user → compPoints → tipCount → rank
    selectQueue.push([{ name: 'Alice' }]);
    selectQueue.push([{ points: 10 }]);
    selectQueue.push([{ total: 5 }]);
    selectQueue.push([{ rank: 2 }]);

    const result = await dashboardRepository.getUserStats('u1', CID);

    expect(result).toEqual({ name: 'Alice', points: 10, totalTips: 5, rank: 2 });
  });

  it('gives rank 1 and 0 points to a user with no competition entries', async () => {
    selectQueue.push([{ name: 'Bob' }]);
    selectQueue.push([]);           // no compPoints row → points defaults to 0
    selectQueue.push([{ total: 0 }]);
    selectQueue.push([{ rank: 1 }]);

    const result = await dashboardRepository.getUserStats('u2', CID);

    expect(result?.points).toBe(0);
    expect(result?.rank).toBe(1);
  });
});

describe('dashboardRepository.get', () => {
  beforeEach(() => { selectQueue = []; vi.clearAllMocks(); });

  it('returns only upcoming matches when userId is null (unauthenticated)', async () => {
    selectQueue.push([UPCOMING_MATCH]); // getUpcomingMatches
    const result = await dashboardRepository.get(CID, null);

    expect(result.upcomingMatches).toEqual([UPCOMING_MATCH]);
    expect(result.userStats).toBeNull();
    expect(result.recentTips).toEqual([]);
  });

  it('returns full dashboard data for an authenticated user', async () => {
    // Promise.all fires all three functions; getUserStats does 4 internal selects.
    // db.select() call order:
    //   [0] getUpcomingMatches (synchronous before first await)
    //   [1] getUserStats — user select, then suspends at first await
    //   [2] getRecentTips (synchronous before first await)
    //   getUserStats resumes: [3] compPoints, [4] tipCount, [5] rank
    selectQueue.push([UPCOMING_MATCH]);                 // [0]
    selectQueue.push([{ name: 'Alice' }]);              // [1] user
    selectQueue.push([RECENT_TIP]);                     // [2]
    selectQueue.push([{ points: 10 }]);                 // [3] compPoints
    selectQueue.push([{ total: 3 }]);                   // [4] tipCount
    selectQueue.push([{ rank: 1 }]);                    // [5] rank

    const result = await dashboardRepository.get(CID, 'u1');

    expect(result.upcomingMatches).toEqual([UPCOMING_MATCH]);
    expect(result.userStats).toEqual({ name: 'Alice', points: 10, totalTips: 3, rank: 1 });
    expect(result.recentTips).toEqual([RECENT_TIP]);
  });
});
