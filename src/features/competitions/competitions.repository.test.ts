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
  eq: vi.fn(() => 'eq'),
  desc: vi.fn(() => 'desc'),
}));

import { competitionsRepository } from './competitions.repository';

const WC = {
  id: 'c1',
  name: 'FIFA World Cup 2026',
  slug: 'wc-2026',
  sport: 'football',
  status: 'active' as const,
  startDate: new Date('2026-06-11'),
  endDate: new Date('2026-07-19'),
  createdAt: new Date('2026-01-01'),
};

describe('competitionsRepository', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns an empty array when no competitions exist', async () => {
      selectQueue.push([]);
      expect(await competitionsRepository.getAll()).toEqual([]);
    });

    it('returns all competition rows', async () => {
      selectQueue.push([WC]);
      expect(await competitionsRepository.getAll()).toEqual([WC]);
    });
  });

  describe('getById', () => {
    it('returns the competition when found', async () => {
      selectQueue.push([WC]);
      expect(await competitionsRepository.getById('c1')).toEqual(WC);
    });

    it('returns null when not found', async () => {
      selectQueue.push([]);
      expect(await competitionsRepository.getById('unknown')).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('returns the competition when slug matches', async () => {
      selectQueue.push([WC]);
      expect(await competitionsRepository.getBySlug('wc-2026')).toEqual(WC);
    });

    it('returns null when slug does not match', async () => {
      selectQueue.push([]);
      expect(await competitionsRepository.getBySlug('no-such-slug')).toBeNull();
    });
  });

  describe('getActive', () => {
    it('returns an empty array when no active competitions exist', async () => {
      selectQueue.push([]);
      expect(await competitionsRepository.getActive()).toEqual([]);
    });

    it('returns active competition rows', async () => {
      selectQueue.push([WC]);
      expect(await competitionsRepository.getActive()).toEqual([WC]);
    });
  });
});
