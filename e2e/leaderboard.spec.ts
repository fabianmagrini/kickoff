import { test, expect, type Page } from '@playwright/test';

async function getCompetitionId(page: Page): Promise<string> {
  await page.goto('/');
  await page.waitForURL(/\/competitions\/.+/, { timeout: 10_000 });
  const match = page.url().match(/\/competitions\/([^/]+)/);
  if (!match) throw new Error('Could not extract competitionId from URL');
  return match[1];
}

test('leaderboard renders the heading', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leaderboard`);
  await expect(page.getByRole('heading', { level: 1, name: /leaderboard/i })).toBeVisible();
});

test('leaderboard shows ranked rows or empty state', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leaderboard`);
  await page.waitForLoadState('networkidle');
  const rows = page.locator('.border.p-4.rounded-xl');
  const hasRows = await rows.count() > 0;
  if (hasRows) {
    const first = rows.first();
    await expect(first.locator('span').nth(0)).toContainText('1');
    await expect(first.locator('span').nth(1)).not.toBeEmpty();
    await expect(first.locator('span').nth(2)).toContainText('pts');
  } else {
    await expect(page.getByText(/no scores yet/i)).toBeVisible();
  }
});
