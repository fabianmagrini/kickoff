import { test, expect, type Page } from '@playwright/test';

async function getCompetitionId(page: Page): Promise<string> {
  await page.goto('/');
  await page.waitForURL(/\/competitions\/.+/, { timeout: 10_000 });
  const match = page.url().match(/\/competitions\/([^/]+)/);
  if (!match) throw new Error('Could not extract competitionId from URL');
  return match[1];
}

async function gotoFixtures(page: Page): Promise<string> {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/matches`);
  return competitionId;
}

test('fixture list page renders the heading', async ({ page }) => {
  await gotoFixtures(page);
  await expect(
    page.getByRole('heading', { level: 1, name: /fixtures/i }),
  ).toBeVisible();
});

test('unauthenticated user sees sign-in prompt on match detail', async ({ page }) => {
  await gotoFixtures(page);
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  await firstMatch.click();
  await expect(page.getByRole('heading', { name: /your tip/i })).toBeVisible();
  await expect(page.getByText('Sign in to submit a tip')).toBeVisible();
});

test('match detail page shows AI Co-Pilot section', async ({ page }) => {
  await gotoFixtures(page);
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  await firstMatch.click();
  await expect(page.getByRole('heading', { name: /ai co-pilot/i })).toBeVisible();
});

test('fixture list renders match rows grouped by stage', async ({ page }) => {
  await gotoFixtures(page);
  const matchLinks = page.locator('a[href^="/matches/"]');
  test.skip(await matchLinks.count() === 0, 'No matches seeded — run npm run db:seed:dev');
  await expect(matchLinks.first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /group/i }).first()).toBeVisible();
});

test('completed status filter shows matches with scores', async ({ page }) => {
  await gotoFixtures(page);
  const matchLinks = page.locator('a[href^="/matches/"]');
  test.skip(await matchLinks.count() === 0, 'No matches seeded — run npm run db:seed:dev');

  await page.getByRole('button', { name: 'Completed' }).click();
  const completedLinks = page.locator('a[href^="/matches/"]');
  test.skip(await completedLinks.count() === 0, 'No completed matches seeded');
  await expect(page.locator('text=/\\d+ – \\d+/').first()).toBeVisible();
});

test('live status filter shows empty state when no live matches', async ({ page }) => {
  await gotoFixtures(page);
  await page.getByRole('button', { name: 'Live' }).click();
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

test('Consult Co-Pilot button shows analysing state while request is in flight', async ({ page }) => {
  await gotoFixtures(page);
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  test.skip(await firstMatch.count() === 0, 'No scheduled matches — run npm run db:seed:dev');
  await firstMatch.click();
  await page.waitForURL(/\/matches\/.+/);
  await page.waitForLoadState('networkidle');

  const hasButton = await page.getByRole('button', { name: /consult co-pilot/i }).isVisible();
  test.skip(!hasButton, 'Insight already cached for this match — loading state test not applicable');

  await page.route('**/_serverFn/**', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise(r => setTimeout(r, 2000));
      await route.continue();
    } else {
      await route.continue();
    }
  });

  await page.getByRole('button', { name: /consult co-pilot/i }).click();
  await expect(page.getByRole('button', { name: /analysing/i })).toBeVisible({ timeout: 1_000 });
  await expect(page.getByRole('button', { name: /analysing/i })).toBeDisabled();
});

test('cached insight loads without button on hard reload', async ({ page }) => {
  await gotoFixtures(page);
  const firstMatch = page.getByRole('link', { name: /vs/i }).first();
  test.skip(await firstMatch.count() === 0, 'No scheduled matches — run npm run db:seed:dev');
  await firstMatch.click();
  await page.waitForURL(/\/matches\/.+/);
  const matchUrl = page.url();
  await page.waitForLoadState('networkidle');

  const hasInsight = await page.getByText(/Home Win/i).isVisible();
  test.skip(!hasInsight, 'No cached insight for this match — click Consult Co-Pilot first');

  await page.goto(matchUrl);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Home Win/i)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: /consult co-pilot/i })).not.toBeVisible();
});
