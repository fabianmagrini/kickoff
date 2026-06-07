import { createServerFn } from '@tanstack/react-start';
import { leaderboardRepository } from '@/features/leaderboard/leaderboard.repository';
import { logServerFn } from '@/lib/logger';

export const getLeaderboardFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(({ data: competitionId }) =>
    logServerFn('getLeaderboardFn', () => leaderboardRepository.getTopN(competitionId)),
  );
