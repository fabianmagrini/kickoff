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
  ne: vi.fn(() => 'ne'),
  asc: vi.fn(() => 'asc'),
  sql: vi.fn(() => 'sql'),
}));

import { leaderboardRepository } from './leaderboard.repository';

describe('leaderboardRepository.getTopN', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  it('returns an empty array when no users exist', async () => {
    selectQueue.push([]);
    expect(await leaderboardRepository.getTopN('comp-1')).toEqual([]);
  });

  it('returns leaderboard entries in the shape returned by the DB', async () => {
    const rows = [
      { id: 'u1', name: 'Alice', points: 12 },
      { id: 'u2', name: 'Bob', points: 7 },
    ];
    selectQueue.push(rows);
    expect(await leaderboardRepository.getTopN('comp-1')).toEqual(rows);
  });

  it('uses 50 as the default limit', async () => {
    selectQueue.push([{ id: 'u1', name: 'Alice', points: 12 }]);
    await leaderboardRepository.getTopN('comp-1');
    const { db } = await import('@/db');
    const builder = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(builder.limit).toHaveBeenCalledWith(50);
  });

  it('passes a custom limit and returns the correct row', async () => {
    const row = { id: 'u1', name: 'Alice', points: 12 };
    selectQueue.push([row]);
    const result = await leaderboardRepository.getTopN('comp-1', 1);
    expect(result).toEqual([row]);
  });
});
