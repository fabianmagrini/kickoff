import { test, expect, type Page } from '@playwright/test';

async function signUp(page: Page, name: string) {
  const email = `e2e-profile-${Date.now()}@kickoff.test`;
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
  await page.waitForURL(/\/competitions\//, { timeout: 15_000 });
}

test('unauthenticated visitor to /profile is redirected to /login', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
});

test('/login page is shown with the sign-in form after the redirect', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});

test('authenticated user sees their name and email on the profile page', async ({ page }) => {
  await signUp(page, 'Profile Tester');
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: 'Profile Tester' })).toBeVisible();
  await expect(page.getByText(/e2e-profile-.*@kickoff\.test/)).toBeVisible();
});

test('authenticated user sees Points, Tips, and Rank stat cards', async ({ page }) => {
  await signUp(page, 'Stats Tester');
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Points', { exact: true })).toBeVisible();
  await expect(page.getByText('Tips', { exact: true })).toBeVisible();
  await expect(page.getByText('Rank', { exact: true })).toBeVisible();
});

test('authenticated user with no tips sees empty tip history message', async ({ page }) => {
  await signUp(page, 'No Tips Tester');
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('No tips yet.')).toBeVisible();
  await expect(page.getByRole('link', { name: /browse fixtures/i })).toBeVisible();
});
