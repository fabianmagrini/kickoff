import { createServerFn } from '@tanstack/react-start';
import { leaderboardRepository } from '@/features/leaderboard/leaderboard.repository';

export const getLeaderboardFn = createServerFn({ method: 'GET' })
  .inputValidator((competitionId: string) => competitionId)
  .handler(({ data: competitionId }) => leaderboardRepository.getTopN(competitionId));
