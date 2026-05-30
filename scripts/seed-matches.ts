/**
 * Production seed — fetches all 104 FIFA World Cup 2026 fixtures from API-Football
 * and populates the matches table. Re-running updates scores and statuses.
 *
 * Requires: API_FOOTBALL_KEY (free tier at https://api-sports.io — 100 req/day)
 * Run: node --env-file=.env --import=tsx/esm scripts/seed-matches.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { matches } from '../src/db/schema.ts';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!process.env.API_FOOTBALL_KEY) {
  console.error(
    'API_FOOTBALL_KEY is not set.\nGet a free key at https://api-sports.io and add it to .env',
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

type ApiFixture = {
  fixture: {
    date: string;
    status: { short: string };
    venue: { name: string | null; city: string | null };
  };
  league: { round: string };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
};

function mapStatus(short: string): 'scheduled' | 'live' | 'completed' {
  if (['FT', 'AET', 'PEN'].includes(short)) return 'completed';
  if (['1H', 'HT', '2H', 'ET', 'P'].includes(short)) return 'live';
  return 'scheduled';
}

function mapGroup(round: string): string | null {
  const groupMatch = round.match(/^Group ([A-L])$/i);
  if (groupMatch) return groupMatch[1].toUpperCase();
  if (/round of 32/i.test(round)) return 'Round of 32';
  if (/round of 16/i.test(round)) return 'Round of 16';
  if (/quarter/i.test(round)) return 'Quarter-Final';
  if (/semi/i.test(round)) return 'Semi-Final';
  if (/3rd/i.test(round)) return '3rd Place';
  if (/final/i.test(round)) return 'Final';
  return null;
}

async function main() {
  console.log('Fetching fixtures from API-Football (league=1, season=2026)...');

  const res = await fetch(
    'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } },
  );

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${await res.text()}`);
  }

  const body = await res.json() as { errors: unknown; response: ApiFixture[] };

  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(body.errors)}`);
  }

  const fixtures = body.response;
  console.log(`Fetched ${fixtures.length} fixtures`);

  if (fixtures.length === 0) {
    console.warn('No fixtures returned — check that season=2026 is available on your plan.');
    return;
  }

  const rows = fixtures.map((f) => ({
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    group: mapGroup(f.league.round),
    venue: [f.fixture.venue.name, f.fixture.venue.city].filter(Boolean).join(', ') || 'TBD',
    matchDate: new Date(f.fixture.date),
    homeScore: f.goals.home,
    awayScore: f.goals.away,
    status: mapStatus(f.fixture.status.short),
  }));

  console.log('Clearing existing matches...');
  await db.delete(matches);

  console.log(`Inserting ${rows.length} matches...`);
  await db.insert(matches).values(rows);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
