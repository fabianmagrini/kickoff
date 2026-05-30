import { createServerFn } from '@tanstack/react-start';
import { leaderboardRepository } from '@/features/leaderboard/leaderboard.repository';

export const getLeaderboardFn = createServerFn({ method: 'GET' })
  .handler(() => leaderboardRepository.getTopN());
