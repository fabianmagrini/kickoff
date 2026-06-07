/**
 * One-time migration: introduce competitions as a first-class concept.
 *
 * Run once after deploying the new schema:
 *   npm run db:migrate:competitions
 *
 * What it does:
 *   1. Creates the "FIFA World Cup 2026" competition record
 *   2. Sets competitionId on all existing matches and leagues
 *   3. Seeds userCompetitionPoints from existing users.points
 */

import { db } from '../src/db/index.js';
import { competitions, matches, leagues, users, userCompetitionPoints } from '../src/db/schema.js';
import { eq, isNull } from 'drizzle-orm';

async function main() {
  console.log('Migrating to multi-competition schema…');

  // 1. Create WC 2026 competition (idempotent)
  let [wc2026] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.slug, 'wc-2026'));

  if (!wc2026) {
    [wc2026] = await db
      .insert(competitions)
      .values({
        name: 'FIFA World Cup 2026',
        slug: 'wc-2026',
        sport: 'football',
        startDate: new Date('2026-06-11T00:00:00Z'),
        endDate: new Date('2026-07-19T23:59:59Z'),
        status: 'active',
      })
      .returning();
    console.log(`  Created competition: ${wc2026.name} (${wc2026.id})`);
  } else {
    console.log(`  Competition already exists: ${wc2026.name} (${wc2026.id})`);
  }

  // 2. Backfill matches — set competitionId where null
  const matchResult = await db
    .update(matches)
    .set({ competitionId: wc2026.id })
    .where(isNull(matches.competitionId));
  console.log(`  Updated matches with competitionId`);

  // 3. Backfill leagues — set competitionId where null
  await db
    .update(leagues)
    .set({ competitionId: wc2026.id })
    .where(isNull(leagues.competitionId));
  console.log(`  Updated leagues with competitionId`);

  // 4. Seed userCompetitionPoints from users.points (idempotent via ON CONFLICT DO NOTHING)
  const allUsers = await db.select({ id: users.id, points: users.points }).from(users);
  let seeded = 0;
  for (const user of allUsers) {
    if (user.points > 0) {
      await db
        .insert(userCompetitionPoints)
        .values({ userId: user.id, competitionId: wc2026.id, points: user.points })
        .onConflictDoNothing();
      seeded++;
    }
  }
  console.log(`  Seeded userCompetitionPoints for ${seeded} users`);

  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
