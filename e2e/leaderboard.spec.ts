import { test, expect } from '@playwright/test';

test('leaderboard renders the heading', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { level: 1, name: /leaderboard/i })).toBeVisible();
});

test('leaderboard shows ranked rows or empty state', async ({ page }) => {
  await page.goto('/leaderboard');
  await page.waitForLoadState('networkidle');
  const rows = page.locator('.border.p-4.rounded-xl');
  const hasRows = await rows.count() > 0;
  if (hasRows) {
    // First row has rank number, a name, and a points value
    const first = rows.first();
    await expect(first.locator('span').nth(0)).toContainText('1');
    await expect(first.locator('span').nth(1)).not.toBeEmpty();
    await expect(first.locator('span').nth(2)).toContainText('pts');
  } else {
    await expect(page.getByText(/no scores yet/i)).toBeVisible();
  }
});
