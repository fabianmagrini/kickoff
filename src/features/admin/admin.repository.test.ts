import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable result returned by the update builder's .returning() call.
// Set this before each test to control what the DB returns.
let returningResult: unknown[] = [];

const updateBuilder = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(() => Promise.resolve(returningResult)),
};

vi.mock('@/db', () => ({
  db: {
    update: vi.fn(() => updateBuilder),
  },
}));

vi.mock('@/features/scoring/scoring.service', () => ({
  scoreCompletedMatches: vi.fn().mockResolvedValue({ tipsScored: 0, matchesProcessed: 0 }),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
}));

import { adminRepository } from './admin.repository';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';

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
    returningResult = [];
    vi.clearAllMocks();
  });

  it('returns the updated match on a scheduled → live update', async () => {
    const updated = { ...baseMatch, status: 'live' as const };
    returningResult = [updated];

    const result = await adminRepository.updateMatch('m1', {
      homeScore: null,
      awayScore: null,
      status: 'live',
    });

    expect(result).toEqual(updated);
    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });

  it('returns the updated match on a scheduled → completed update', async () => {
    const updated = { ...baseMatch, homeScore: 2, awayScore: 1, status: 'completed' as const };
    returningResult = [updated];

    const result = await adminRepository.updateMatch('m1', {
      homeScore: 2,
      awayScore: 1,
      status: 'completed',
    });

    expect(result).toEqual(updated);
  });

  it('throws when the match is not found', async () => {
    returningResult = [];

    await expect(
      adminRepository.updateMatch('missing-id', { homeScore: 1, awayScore: 0, status: 'completed' }),
    ).rejects.toThrow('Match not found');
  });

  it('calls scoreCompletedMatches when status is completed', async () => {
    returningResult = [{ ...baseMatch, homeScore: 2, awayScore: 1, status: 'completed' }];

    await adminRepository.updateMatch('m1', { homeScore: 2, awayScore: 1, status: 'completed' });

    expect(scoreCompletedMatches).toHaveBeenCalledOnce();
  });

  it('does not call scoreCompletedMatches when status is scheduled', async () => {
    returningResult = [{ ...baseMatch, status: 'scheduled' }];

    await adminRepository.updateMatch('m1', { homeScore: null, awayScore: null, status: 'scheduled' });

    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });

  it('does not call scoreCompletedMatches when status is live', async () => {
    returningResult = [{ ...baseMatch, status: 'live' }];

    await adminRepository.updateMatch('m1', { homeScore: null, awayScore: null, status: 'live' });

    expect(scoreCompletedMatches).not.toHaveBeenCalled();
  });
});
