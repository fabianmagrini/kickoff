import { test, expect } from '@playwright/test';

test('home page loads and shows app title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kickoff' })).toBeVisible();
});

test('home page has links to fixtures and leaderboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /fixtures/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /leaderboard/i })).toBeVisible();
});

test('navigating to fixtures shows the page heading', async ({ page }) => {
  await page.goto('/matches');
  await expect(page.getByRole('heading', { name: /world cup 2026 fixtures/i })).toBeVisible();
});

test('navigating to leaderboard shows the page heading', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible();
});
