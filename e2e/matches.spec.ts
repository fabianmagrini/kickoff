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
