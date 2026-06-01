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
    expect(await leaderboardRepository.getTopN()).toEqual([]);
  });

  it('returns leaderboard entries in the shape returned by the DB', async () => {
    const rows = [
      { id: 'u1', name: 'Alice', points: 12 },
      { id: 'u2', name: 'Bob', points: 7 },
    ];
    selectQueue.push(rows);
    expect(await leaderboardRepository.getTopN()).toEqual(rows);
  });

  it('uses 50 as the default limit', async () => {
    selectQueue.push([{ id: 'u1', name: 'Alice', points: 12 }]);
    await leaderboardRepository.getTopN();
    const { db } = await import('@/db');
    const builder = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(builder.limit).toHaveBeenCalledWith(50);
  });

  it('passes a custom limit without throwing', async () => {
    selectQueue.push([{ id: 'u1', name: 'Alice', points: 12 }]);
    const result = await leaderboardRepository.getTopN(1);
    expect(result).toHaveLength(1);
  });
});
