import { test, expect } from '@playwright/test';

test('fixture list page renders the heading', async ({ page }) => {
  await page.goto('/matches');
  await expect(
    page.getByRole('heading', { level: 1, name: /world cup 2026 fixtures/i }),
  ).toBeVisible();
});

test('unauthenticated user sees sign-in prompt on match detail', async ({ page }) => {
  await page.goto('/matches');
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  await firstMatch.click();
  await expect(page.getByRole('heading', { name: /your tip/i })).toBeVisible();
  await expect(page.getByText('Sign in to submit a tip')).toBeVisible();
});

test('match detail page shows AI Co-Pilot section', async ({ page }) => {
  await page.goto('/matches');
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  await firstMatch.click();
  await expect(page.getByRole('heading', { name: /ai co-pilot/i })).toBeVisible();
});

test('fixture list renders match rows grouped by stage', async ({ page }) => {
  await page.goto('/matches');
  const matchLinks = page.locator('a[href^="/matches/"]');
  test.skip(await matchLinks.count() === 0, 'No matches seeded — run npm run db:seed:dev');
  await expect(matchLinks.first()).toBeVisible();
  // Group headings are rendered as uppercase h2s (e.g. "GROUP A")
  await expect(page.getByRole('heading', { level: 2, name: /group/i }).first()).toBeVisible();
});

test('completed status filter shows matches with scores', async ({ page }) => {
  await page.goto('/matches');
  const matchLinks = page.locator('a[href^="/matches/"]');
  test.skip(await matchLinks.count() === 0, 'No matches seeded — run npm run db:seed:dev');

  await page.getByRole('button', { name: 'Completed' }).click();
  const completedLinks = page.locator('a[href^="/matches/"]');
  test.skip(await completedLinks.count() === 0, 'No completed matches seeded');
  // Completed rows show a score (digit – digit), not "vs"
  await expect(page.locator('text=/\\d+ – \\d+/').first()).toBeVisible();
});

test('live status filter shows empty state when no live matches', async ({ page }) => {
  await page.goto('/matches');
  await page.getByRole('button', { name: 'Live' }).click();
  // Either live matches are shown or the empty-state message appears
  const hasLiveMatches = await page.locator('a[href^="/matches/"]').count() > 0;
  if (!hasLiveMatches) {
    await expect(page.getByText(/no live matches/i)).toBeVisible();
  }
});

test('invalid match ID shows error boundary', async ({ page }) => {
  await page.goto('/matches/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
  await expect(page.getByText('Match not found')).toBeVisible();
});
