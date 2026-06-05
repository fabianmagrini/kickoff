import { execSync } from 'child_process';

export default function globalSetup() {
  if (!process.env.DATABASE_URL) {
    console.log('[global-setup] DATABASE_URL not set — skipping seed');
    return;
  }
  console.log('[global-setup] Seeding dev fixtures…');
  execSync('npm run db:seed:dev', { stdio: 'inherit' });
  console.log('[global-setup] Seed complete');
}
