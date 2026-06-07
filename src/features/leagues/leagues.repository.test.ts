import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Select queue (pop per db.select() call) ──────────────────────────────────
let selectQueue: unknown[] = [];

function makeSelectBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

// ── Insert queue (pop per db.insert() call) ──────────────────────────────────
let insertQueue: unknown[] = [];

function makeInsertBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  builder.values = vi.fn(() => builder);
  builder.returning = vi.fn(() => Promise.resolve(resolveWith));
  // Direct await (no .returning()) also consumes from the builder
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
  and: vi.fn(() => 'and'),
  desc: vi.fn(() => 'desc'),
  sql: vi.fn(() => 'sql'),
}));

import { leaguesRepository } from './leagues.repository';

const BASE_LEAGUE = {
  id: 'l1',
  name: 'Kickoff Kings',
  inviteCode: 'ABC123',
  ownerId: 'u1',
  createdAt: new Date('2026-06-01'),
};

describe('leaguesRepository', () => {
  beforeEach(() => {
    selectQueue = [];
    insertQueue = [];
    vi.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns the new league after inserting it and its first member', async () => {
      insertQueue.push([BASE_LEAGUE]); // leagues insert → returning [league]
      insertQueue.push([]);            // leagueMembers insert → no returning needed

      const result = await leaguesRepository.create('Kickoff Kings', 'u1', 'comp-1');

      expect(result).toEqual(BASE_LEAGUE);
      const { db } = await import('@/db');
      expect(db.insert).toHaveBeenCalledTimes(2);
    });
  });

  // ── joinByCode ───────────────────────────────────────────────────────────────

  describe('joinByCode', () => {
    it('throws League not found when no matching invite code', async () => {
      selectQueue.push([]); // leagues select → empty

      await expect(leaguesRepository.joinByCode('NOPE', 'u2')).rejects.toThrow(
        'League not found',
      );
    });

    it('throws Already a member when user is already in the league', async () => {
      selectQueue.push([BASE_LEAGUE]);                                  // league found
      selectQueue.push([{ id: 'm1', leagueId: 'l1', userId: 'u1' }]); // existing member

      await expect(leaguesRepository.joinByCode('ABC123', 'u1')).rejects.toThrow(
        'Already a member of this league',
      );
    });

    it('inserts a member and returns the league on success', async () => {
      selectQueue.push([BASE_LEAGUE]); // league found
      selectQueue.push([]);            // no existing member
      insertQueue.push([]);            // leagueMembers insert

      const result = await leaguesRepository.joinByCode('ABC123', 'u2');

      expect(result).toEqual(BASE_LEAGUE);
    });
  });

  // ── getMyLeagues ─────────────────────────────────────────────────────────────

  describe('getMyLeagues', () => {
    it('returns an empty array when the user has no leagues', async () => {
      selectQueue.push([]);
      expect(await leaguesRepository.getMyLeagues('u1', 'comp-1')).toEqual([]);
    });

    it('returns the leagues the user belongs to', async () => {
      selectQueue.push([BASE_LEAGUE]);
      expect(await leaguesRepository.getMyLeagues('u1', 'comp-1')).toEqual([BASE_LEAGUE]);
    });
  });

  // ── getById ──────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns null when user is not a member of the league', async () => {
      selectQueue.push([]); // inner join finds no rows
      expect(await leaguesRepository.getById('l1', 'u99')).toBeNull();
    });

    it('returns the league when user is a member', async () => {
      selectQueue.push([BASE_LEAGUE]);
      expect(await leaguesRepository.getById('l1', 'u1')).toEqual(BASE_LEAGUE);
    });
  });

  // ── getLeaderboard ───────────────────────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('returns an empty array when the league has no competitionId', async () => {
      selectQueue.push([]); // leagues select → empty (league not found)
      expect(await leaguesRepository.getLeaderboard('l1')).toEqual([]);
    });

    it('returns members in the shape returned by the DB', async () => {
      const rows = [
        { id: 'u1', name: 'Alice', points: 12 },
        { id: 'u2', name: 'Bob', points: 7 },
      ];
      selectQueue.push([{ ...BASE_LEAGUE, competitionId: 'comp-1' }]); // league lookup
      selectQueue.push(rows); // leaderboard select
      expect(await leaguesRepository.getLeaderboard('l1')).toEqual(rows);
    });
  });
});
