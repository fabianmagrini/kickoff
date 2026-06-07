/**
 * Development seed — all 72 group stage fixtures for FIFA World Cup 2026,
 * based on the official draw (December 5, 2024).
 *
 * Two Group A matches are seeded as 'completed' with scores so the scoring
 * cron at POST /api/cron/score can be exercised immediately.
 *
 * Run: node --env-file=.env --import=tsx/esm scripts/seed-dev.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { matches, competitions } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

// Actual 2026 World Cup draw results
const GROUPS: Record<string, [string, string, string, string]> = {
  A: ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curacao', "Cote d'Ivoire", 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

const VENUES = [
  'MetLife Stadium, East Rutherford',
  'AT&T Stadium, Arlington',
  'SoFi Stadium, Inglewood',
  "Levi's Stadium, Santa Clara",
  'Rose Bowl, Pasadena',
  'Mercedes-Benz Stadium, Atlanta',
  'Arrowhead Stadium, Kansas City',
  'Gillette Stadium, Foxborough',
  'Lincoln Financial Field, Philadelphia',
  'Lumen Field, Seattle',
  'Hard Rock Stadium, Miami Gardens',
  'Estadio Azteca, Mexico City',
  'Estadio Akron, Guadalajara',
  'Estadio BBVA, Monterrey',
  'BMO Field, Toronto',
  'BC Place, Vancouver',
];

// Matchday base dates (UTC) — group stage runs June 12 – June 29
const MATCHDAY_BASE = [
  new Date('2026-06-12T18:00:00Z'),
  new Date('2026-06-19T18:00:00Z'),
  new Date('2026-06-26T18:00:00Z'), // final matchday simultaneous kick-offs
];

type MatchInsert = typeof matches.$inferInsert;

function buildGroupFixtures(
  group: string,
  [a, b, c, d]: [string, string, string, string],
  venueOffset: number,
  competitionId: string,
): MatchInsert[] {
  const pairings: [[string, string], [string, string]][] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];

  return pairings.flatMap(([[h1, a1], [h2, a2]], matchday) => [
    {
      competitionId,
      homeTeam: h1, awayTeam: a1, group,
      venue: VENUES[(venueOffset * 2) % VENUES.length],
      matchDate: new Date(MATCHDAY_BASE[matchday]),
      status: 'scheduled' as const, homeScore: null, awayScore: null,
    },
    {
      competitionId,
      homeTeam: h2, awayTeam: a2, group,
      venue: VENUES[(venueOffset * 2 + 1) % VENUES.length],
      matchDate: new Date(MATCHDAY_BASE[matchday].getTime() + 3 * 60 * 60 * 1000),
      status: 'scheduled' as const, homeScore: null, awayScore: null,
    },
  ]);
}

async function main() {
  // Ensure WC 2026 competition exists
  let [wc2026] = await db.select().from(competitions).where(eq(competitions.slug, 'wc-2026'));
  if (!wc2026) {
    [wc2026] = await db.insert(competitions).values({
      name: 'FIFA World Cup 2026',
      slug: 'wc-2026',
      sport: 'football',
      startDate: new Date('2026-06-11T00:00:00Z'),
      endDate: new Date('2026-07-19T23:59:59Z'),
      status: 'active',
    }).returning();
    console.log(`Created competition: ${wc2026.name}`);
  }

  const fixtures: MatchInsert[] = [];
  Object.entries(GROUPS).forEach(([group, teams], i) => {
    fixtures.push(...buildGroupFixtures(group, teams, i, wc2026.id));
  });

  // Mark two Group A matches as completed so scoring can be tested immediately
  const mexicoMatch = fixtures.find((m) => m.group === 'A' && m.homeTeam === 'Mexico')!;
  mexicoMatch.status = 'completed';
  mexicoMatch.homeScore = 2;
  mexicoMatch.awayScore = 1;
  mexicoMatch.matchDate = new Date('2026-06-12T20:00:00Z');

  const koreaMatch = fixtures.find((m) => m.group === 'A' && m.homeTeam === 'Korea Republic')!;
  koreaMatch.status = 'completed';
  koreaMatch.homeScore = 0;
  koreaMatch.awayScore = 0;
  koreaMatch.matchDate = new Date('2026-06-12T17:00:00Z');

  console.log('Clearing existing matches...');
  await db.delete(matches);

  console.log(`Inserting ${fixtures.length} group stage fixtures...`);
  await db.insert(matches).values(fixtures);
  console.log(`Done. ${fixtures.length} matches seeded (2 completed in Group A for scoring tests).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
