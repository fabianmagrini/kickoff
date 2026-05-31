import { test, expect } from '@playwright/test';

test('app brand is visible in the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Kickoff' }),
  ).toBeVisible();
});

test('unauthenticated home page shows a sign-in call to action', async ({ page }) => {
  await page.goto('/');
  // Guest h1 is "Kickoff"; authenticated h1 is "Welcome back, <name>"
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Unauthenticated dashboard always renders a "Sign in" link
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
});

test('navbar has links to fixtures and leaderboard', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation');
  await expect(nav.getByRole('link', { name: 'Fixtures' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
});

test('navigating to fixtures shows the page heading', async ({ page }) => {
  await page.goto('/matches');
  await expect(
    page.getByRole('heading', { level: 1, name: /world cup 2026 fixtures/i }),
  ).toBeVisible();
});

test('navigating to leaderboard shows the page heading', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(
    page.getByRole('heading', { level: 1, name: /leaderboard/i }),
  ).toBeVisible();
});
