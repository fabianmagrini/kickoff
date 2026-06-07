import { db } from '@/db';
import { matches, adminAuditLog, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { scoreCompletedMatches } from '@/features/scoring/scoring.service';
import type { Match } from '@/features/matches/matches.repository';

export type MatchUpdate = {
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'completed';
};

export type AuditLogEntry = {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  homeTeam: string;
  awayTeam: string;
  previousHomeScore: number | null;
  previousAwayScore: number | null;
  newHomeScore: number | null;
  newAwayScore: number | null;
  changedAt: Date;
};

export const adminRepository = {
  updateMatch: async (id: string, update: MatchUpdate, userId: string): Promise<Match> => {
    const [current] = await db.select().from(matches).where(eq(matches.id, id));
    if (!current) throw new Error('Match not found');

    await db.insert(adminAuditLog).values({
      matchId: id,
      userId,
      previousHomeScore: current.homeScore,
      previousAwayScore: current.awayScore,
      newHomeScore: update.homeScore,
      newAwayScore: update.awayScore,
    });

    const [updated] = await db
      .update(matches)
      .set(update)
      .where(eq(matches.id, id))
      .returning();

    if (updated.status === 'completed') {
      await scoreCompletedMatches();
    }
    return updated;
  },

  getAuditLog: async (limit = 20): Promise<AuditLogEntry[]> => {
    return db
      .select({
        id: adminAuditLog.id,
        matchId: adminAuditLog.matchId,
        userId: adminAuditLog.userId,
        userName: users.name,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        previousHomeScore: adminAuditLog.previousHomeScore,
        previousAwayScore: adminAuditLog.previousAwayScore,
        newHomeScore: adminAuditLog.newHomeScore,
        newAwayScore: adminAuditLog.newAwayScore,
        changedAt: adminAuditLog.changedAt,
      })
      .from(adminAuditLog)
      .innerJoin(matches, eq(adminAuditLog.matchId, matches.id))
      .innerJoin(users, eq(adminAuditLog.userId, users.id))
      .orderBy(desc(adminAuditLog.changedAt))
      .limit(limit);
  },
};
