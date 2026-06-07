import { db } from '@/db';
import { leagues, leagueMembers, users, userCompetitionPoints } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type League = typeof leagues.$inferSelect;
export type LeagueLeaderboardEntry = { id: string; name: string; points: number };

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const leaguesRepository = {
  create: async (name: string, ownerId: string, competitionId: string): Promise<League> => {
    const inviteCode = generateInviteCode();
    const [league] = await db
      .insert(leagues)
      .values({ name, inviteCode, ownerId, competitionId })
      .returning();
    await db.insert(leagueMembers).values({ leagueId: league.id, userId: ownerId });
    return league;
  },

  joinByCode: async (inviteCode: string, userId: string): Promise<League> => {
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.inviteCode, inviteCode.toUpperCase()));
    if (!league) throw new Error('League not found');

    const [existing] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, userId)));
    if (existing) throw new Error('Already a member of this league');

    await db.insert(leagueMembers).values({ leagueId: league.id, userId });
    return league;
  },

  getMyLeagues: async (userId: string, competitionId: string): Promise<League[]> => {
    return db
      .select({
        id: leagues.id,
        name: leagues.name,
        inviteCode: leagues.inviteCode,
        ownerId: leagues.ownerId,
        competitionId: leagues.competitionId,
        createdAt: leagues.createdAt,
      })
      .from(leagues)
      .innerJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
      .where(and(eq(leagueMembers.userId, userId), eq(leagues.competitionId, competitionId)));
  },

  getById: async (leagueId: string, userId: string): Promise<League | null> => {
    const [row] = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        inviteCode: leagues.inviteCode,
        ownerId: leagues.ownerId,
        competitionId: leagues.competitionId,
        createdAt: leagues.createdAt,
      })
      .from(leagues)
      .innerJoin(
        leagueMembers,
        and(eq(leagueMembers.leagueId, leagues.id), eq(leagueMembers.userId, userId)),
      )
      .where(eq(leagues.id, leagueId));
    return row ?? null;
  },

  getLeaderboard: async (leagueId: string): Promise<LeagueLeaderboardEntry[]> => {
    // Get the league's competition so we can scope points correctly
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    if (!league?.competitionId) return [];

    return db
      .select({
        id: users.id,
        name: users.name,
        points: sql<number>`coalesce(${userCompetitionPoints.points}, 0)`,
      })
      .from(users)
      .innerJoin(leagueMembers, and(eq(leagueMembers.userId, users.id), eq(leagueMembers.leagueId, leagueId)))
      .leftJoin(
        userCompetitionPoints,
        and(
          eq(userCompetitionPoints.userId, users.id),
          eq(userCompetitionPoints.competitionId, league.competitionId),
        ),
      )
      .orderBy(desc(sql`coalesce(${userCompetitionPoints.points}, 0)`));
  },
};
