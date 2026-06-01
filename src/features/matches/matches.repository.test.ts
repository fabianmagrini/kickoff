import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectQueue: unknown[] = [];

function makeBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy']) {
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
  eq: vi.fn(() => 'eq'),
}));

import { matchesRepository } from './matches.repository';

describe('matchesRepository', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns empty array when no matches exist', async () => {
      selectQueue.push([]);
      expect(await matchesRepository.getAll()).toEqual([]);
    });

    it('returns all match rows', async () => {
      const rows = [
        { id: 'm1', homeTeam: 'Brazil', awayTeam: 'Germany', status: 'scheduled' },
        { id: 'm2', homeTeam: 'France', awayTeam: 'Spain', status: 'completed' },
      ];
      selectQueue.push(rows);
      expect(await matchesRepository.getAll()).toEqual(rows);
    });
  });

  describe('getById', () => {
    it('returns the match when found', async () => {
      const row = { id: 'm1', homeTeam: 'Brazil', awayTeam: 'Germany', status: 'scheduled' };
      selectQueue.push([row]);
      expect(await matchesRepository.getById('m1')).toEqual(row);
    });

    it('returns null when not found', async () => {
      selectQueue.push([]);
      expect(await matchesRepository.getById('nonexistent')).toBeNull();
    });
  });
});
