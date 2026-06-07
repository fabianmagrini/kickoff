import { db } from '@/db';
import { matches, tips, users, userCompetitionPoints } from '@/db/schema';
import { asc, desc, eq, gt, ne, and, sql } from 'drizzle-orm';

export type UpcomingMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  group: string | null;
  venue: string;
};

export type RecentTip = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned: number;
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type UserStats = {
  name: string;
  points: number;
  rank: number;
  totalTips: number;
};

export type DashboardData = {
  upcomingMatches: UpcomingMatch[];
  userStats: UserStats | null;
  recentTips: RecentTip[];
};

export const dashboardRepository = {
  getUpcomingMatches: async (competitionId: string, limit = 5): Promise<UpcomingMatch[]> =>
    db
      .select({
        id: matches.id,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        matchDate: matches.matchDate,
        group: matches.group,
        venue: matches.venue,
      })
      .from(matches)
      .where(and(eq(matches.competitionId, competitionId), ne(matches.status, 'completed')))
      .orderBy(asc(matches.matchDate))
      .limit(limit),

  getRecentTips: async (userId: string, competitionId: string, limit = 5): Promise<RecentTip[]> =>
    db
      .select({
        id: tips.id,
        matchId: tips.matchId,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        matchDate: matches.matchDate,
        predictedHomeScore: tips.predictedHomeScore,
        predictedAwayScore: tips.predictedAwayScore,
        pointsEarned: tips.pointsEarned,
        matchStatus: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(tips)
      .innerJoin(matches, eq(tips.matchId, matches.id))
      .where(and(eq(tips.userId, userId), eq(matches.competitionId, competitionId)))
      .orderBy(desc(tips.createdAt))
      .limit(limit),

  getUserStats: async (userId: string, competitionId: string): Promise<UserStats | null> => {
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return null;

    const [compPoints] = await db
      .select({ points: userCompetitionPoints.points })
      .from(userCompetitionPoints)
      .where(
        and(
          eq(userCompetitionPoints.userId, userId),
          eq(userCompetitionPoints.competitionId, competitionId),
        ),
      );

    const points = compPoints?.points ?? 0;

    const [tipCount] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(tips)
      .innerJoin(matches, eq(tips.matchId, matches.id))
      .where(and(eq(tips.userId, userId), eq(matches.competitionId, competitionId)));

    const [rankRow] = await db
      .select({ rank: sql<number>`cast(count(*) + 1 as int)` })
      .from(userCompetitionPoints)
      .where(
        and(
          eq(userCompetitionPoints.competitionId, competitionId),
          gt(userCompetitionPoints.points, points),
        ),
      );

    return {
      name: user.name,
      points,
      totalTips: tipCount?.total ?? 0,
      rank: rankRow?.rank ?? 1,
    };
  },

  get: async (competitionId: string, userId: string | null): Promise<DashboardData> => {
    const [upcomingMatches, userStats, recentTips] = await Promise.all([
      dashboardRepository.getUpcomingMatches(competitionId),
      userId ? dashboardRepository.getUserStats(userId, competitionId) : null,
      userId ? dashboardRepository.getRecentTips(userId, competitionId) : [],
    ]);
    return { upcomingMatches, userStats, recentTips };
  },
};
