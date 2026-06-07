import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectQueue: unknown[] = [];

function makeSelectBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'innerJoin', 'orderBy', 'limit']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve);
  return builder;
}

// Mutable result returned by the update builder's .returning() call.
let returningResult: unknown[] = [];

const updateBuilder = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(() => Promise.resolve(returningResult)),
};

const insertBuilder = {
  values: vi.fn(() => Promise.resolve(undefined)),
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeSelectBuilder(selectQueue.shift() ?? [])),
    update: vi.fn(() => updateBuilder),
    insert: vi.fn(() => insertBuilder),
  },
}));

vi.mock('@/features/scoring/scoring.service', () => ({
  scoreCompletedMatches: vi.fn().mockResolvedValue({ tipsScored: 0, matchesProcessed: 0, remaining: 0 }),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  desc: vi.fn(() => 'desc'),
}));

import { adminRepository } from './admin.repository';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';
import { db } from '@/db';

const baseMatch = {
  id: 'm1',
  homeTeam: 'Brazil',
  awayTeam: 'Argentina',
  homeScore: null,
  awayScore: null,
  status: 'scheduled' as const,
  matchDate: new Date().toISOString(),
  group: 'A',
  round: 'group',
};

describe('adminRepository.updateMatch', () => {
  beforeEach(() => {
    selectQueue = [];
    returningResult = [];
    vi.clearAllMocks();
    updateBuilder.set.mockReturnThis();
    updateBuilder.where.mockReturnThis();
    updateBuilder.returning.mockImplementation(() => Promise.resolve(returningResult));
    insertBuilder.values.mockResolvedValue(undefined);
  });

  it('returns the updated match on a scheduled → live update', async () => {
    selectQueue.push([baseMatch]); // current match fetch
    const updated = { ...baseMatch, status: 'live' as const };
    returningResult = [updated];

    const result = await adminRepository.updateMatch('m1', {
      homeScore: null,
      awayScore: null,
      status: 'live',
    }, 'user1');

    expect(result).toEqual(updated);
    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });

  it('returns the updated match on a scheduled → completed update', async () => {
    selectQueue.push([baseMatch]);
    const updated = { ...baseMatch, homeScore: 2, awayScore: 1, status: 'completed' as const };
    returningResult = [updated];

    const result = await adminRepository.updateMatch('m1', {
      homeScore: 2,
      awayScore: 1,
      status: 'completed',
    }, 'user1');

    expect(result).toEqual(updated);
  });

  it('throws when the match is not found', async () => {
    selectQueue.push([]); // no match found

    await expect(
      adminRepository.updateMatch('missing-id', { homeScore: 1, awayScore: 0, status: 'completed' }, 'user1'),
    ).rejects.toThrow('Match not found');
  });

  it('calls scoreCompletedMatches when status is completed', async () => {
    selectQueue.push([baseMatch]);
    returningResult = [{ ...baseMatch, homeScore: 2, awayScore: 1, status: 'completed' }];

    await adminRepository.updateMatch('m1', { homeScore: 2, awayScore: 1, status: 'completed' }, 'user1');

    expect(scoreCompletedMatches).toHaveBeenCalledOnce();
  });

  it('does not call scoreCompletedMatches when status is scheduled', async () => {
    selectQueue.push([baseMatch]);
    returningResult = [{ ...baseMatch, status: 'scheduled' }];

    await adminRepository.updateMatch('m1', { homeScore: null, awayScore: null, status: 'scheduled' }, 'user1');

    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });

  it('does not call scoreCompletedMatches when status is live', async () => {
    selectQueue.push([baseMatch]);
    returningResult = [{ ...baseMatch, status: 'live' }];

    await adminRepository.updateMatch('m1', { homeScore: null, awayScore: null, status: 'live' }, 'user1');

    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });

  it('writes an audit log entry with previous and new scores', async () => {
    const current = { ...baseMatch, homeScore: 1, awayScore: 0 };
    selectQueue.push([current]);
    returningResult = [{ ...current, homeScore: 2, awayScore: 1, status: 'completed' }];

    await adminRepository.updateMatch('m1', { homeScore: 2, awayScore: 1, status: 'completed' }, 'user1');

    expect(db.insert).toHaveBeenCalledOnce();
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'm1',
        userId: 'user1',
        previousHomeScore: 1,
        previousAwayScore: 0,
        newHomeScore: 2,
        newAwayScore: 1,
      }),
    );
  });

  it('records null previous scores for a match not yet played', async () => {
    selectQueue.push([baseMatch]); // homeScore: null, awayScore: null
    returningResult = [{ ...baseMatch, homeScore: 3, awayScore: 2, status: 'completed' }];

    await adminRepository.updateMatch('m1', { homeScore: 3, awayScore: 2, status: 'completed' }, 'user1');

    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        previousHomeScore: null,
        previousAwayScore: null,
        newHomeScore: 3,
        newAwayScore: 2,
      }),
    );
  });
});

describe('adminRepository.getAuditLog', () => {
  beforeEach(() => {
    selectQueue = [];
    vi.clearAllMocks();
  });

  it('returns audit log entries with match and user info', async () => {
    const entry = {
      id: 'log1',
      matchId: 'm1',
      userId: 'u1',
      userName: 'Alice',
      homeTeam: 'Brazil',
      awayTeam: 'Argentina',
      previousHomeScore: null,
      previousAwayScore: null,
      newHomeScore: 2,
      newAwayScore: 1,
      changedAt: new Date(),
    };
    selectQueue.push([entry]);

    const result = await adminRepository.getAuditLog();

    expect(result).toEqual([entry]);
  });

  it('returns an empty array when no log entries exist', async () => {
    selectQueue.push([]);

    const result = await adminRepository.getAuditLog();

    expect(result).toEqual([]);
  });
});
