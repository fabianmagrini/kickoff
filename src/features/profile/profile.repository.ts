import { db } from '@/db';
import { matches, tips, users, competitions } from '@/db/schema';
import { desc, eq, gt, sql } from 'drizzle-orm';

export type ProfileTip = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  group: string | null;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned: number;
  scoredAt: Date | null;
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
  competitionName: string | null;
};

export type ProfileData = {
  name: string;
  email: string;
  points: number;
  rank: number;
  totalTips: number;
  tips: ProfileTip[];
};

export const profileRepository = {
  get: async (userId: string): Promise<ProfileData | null> => {
    const [user] = await db
      .select({ name: users.name, email: users.email, points: users.points })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return null;

    const [rankRow, allTips] = await Promise.all([
      db
        .select({ rank: sql<number>`cast(count(*) + 1 as int)` })
        .from(users)
        .where(gt(users.points, user.points))
        .then(([r]) => r),
      db
        .select({
          id: tips.id,
          matchId: tips.matchId,
          homeTeam: matches.homeTeam,
          awayTeam: matches.awayTeam,
          matchDate: matches.matchDate,
          group: matches.group,
          predictedHomeScore: tips.predictedHomeScore,
          predictedAwayScore: tips.predictedAwayScore,
          pointsEarned: tips.pointsEarned,
          scoredAt: tips.scoredAt,
          matchStatus: matches.status,
          homeScore: matches.homeScore,
          awayScore: matches.awayScore,
          competitionName: competitions.name,
        })
        .from(tips)
        .innerJoin(matches, eq(tips.matchId, matches.id))
        .innerJoin(competitions, eq(matches.competitionId, competitions.id))
        .where(eq(tips.userId, userId))
        .orderBy(desc(matches.matchDate)),
    ]);

    return {
      name: user.name,
      email: user.email,
      points: user.points,
      rank: rankRow?.rank ?? 1,
      totalTips: allTips.length,
      tips: allTips,
    };
  },
};
