import { pgTable, text, timestamp, integer, uuid, boolean, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'completed']);
export const competitionStatusEnum = pgEnum('competition_status', ['upcoming', 'active', 'completed']);

// ─── Competitions ─────────────────────────────────────────────────────────────

export const competitions = pgTable('competitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // e.g. "wc-2026", "euro-2024"
  sport: text('sport').notNull().default('football'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  status: competitionStatusEnum('status').default('upcoming').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Matches ──────────────────────────────────────────────────────────────────

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  group: text('group'),
  venue: text('venue').notNull(),
  matchDate: timestamp('match_date', { withTimezone: true }).notNull(),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  status: matchStatusEnum('status').default('scheduled').notNull(),
}, (t) => [
  index('matches_status_idx').on(t.status),
  index('matches_date_idx').on(t.matchDate),
  index('matches_competition_idx').on(t.competitionId),
]);

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  points: integer('points').default(0).notNull(), // global total across all competitions
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});

// ─── Tips ─────────────────────────────────────────────────────────────────────

export const tips = pgTable('tips', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  predictedHomeScore: integer('predicted_home_score').notNull(),
  predictedAwayScore: integer('predicted_away_score').notNull(),
  pointsEarned: integer('points_earned').default(0).notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }), // null = not yet scored
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('tips_user_match_idx').on(t.userId, t.matchId),
  index('tips_match_idx').on(t.matchId),
  index('tips_user_idx').on(t.userId),
]);

// ─── Per-competition points (drives leaderboards) ─────────────────────────────

export const userCompetitionPoints = pgTable('user_competition_points', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  points: integer('points').default(0).notNull(),
}, (t) => [
  uniqueIndex('user_competition_points_unique_idx').on(t.userId, t.competitionId),
]);

// ─── Leagues ──────────────────────────────────────────────────────────────────

export const leagues = pgTable('leagues', {
  id: uuid('id').defaultRandom().primaryKey(),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leagueMembers = pgTable('league_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').notNull().references(() => leagues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('league_members_unique_idx').on(t.leagueId, t.userId),
]);

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  previousHomeScore: integer('previous_home_score'),
  previousAwayScore: integer('previous_away_score'),
  newHomeScore: integer('new_home_score'),
  newAwayScore: integer('new_away_score'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
}, (t) => [
  index('admin_audit_log_match_idx').on(t.matchId),
  index('admin_audit_log_changed_at_idx').on(t.changedAt),
]);

// ─── AI Insights ──────────────────────────────────────────────────────────────

export const aiMatchInsights = pgTable('ai_match_insights', {
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).primaryKey(),
  winProbabilityHome: integer('win_probability_home').notNull(),
  winProbabilityAway: integer('win_probability_away').notNull(),
  winProbabilityDraw: integer('win_probability_draw').notNull(),
  predictedWinner: text('predicted_winner').notNull(),
  tacticalAnalysis: text('tactical_analysis').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});
