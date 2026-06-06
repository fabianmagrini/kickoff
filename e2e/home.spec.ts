import { test, expect, type Page } from '@playwright/test';

async function signUp(page: Page, name: string) {
  const email = `e2e-home-${Date.now()}@kickoff.test`;
  await page.goto('/login');
  await page.waitForFunction(() => {
    const el = document.querySelector('h1') ?? document.body;
    return Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 10_000 });
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/', { timeout: 15_000 });
}

test('app brand is visible in the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Kickoff' }),
  ).toBeVisible();
});

test('unauthenticated home page shows a sign-in call to action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // "Join the competition" is unique to the UnauthenticatedDashboard CTA block,
  // not the navbar — this assertion fails if the CTA block itself is broken.
  await expect(page.getByText('Join the competition')).toBeVisible();
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

test('authenticated user sees personalised welcome heading and stats cards', async ({ page }) => {
  await signUp(page, 'Home Tester');
  await expect(page.getByRole('heading', { level: 1, name: /welcome back, home/i })).toBeVisible();
  await expect(page.getByText('Your Points')).toBeVisible();
  await expect(page.getByText('Tips Submitted')).toBeVisible();
  await expect(page.getByText('Your Rank')).toBeVisible();
});

test('authenticated user with no tips sees empty-state message', async ({ page }) => {
  await signUp(page, 'No Tips User');
  await expect(page.getByRole('heading', { name: /recent tips/i })).toBeVisible();
  await expect(page.getByText('No tips yet')).toBeVisible();
  await expect(page.getByRole('link', { name: /browse fixtures/i })).toBeVisible();
});
