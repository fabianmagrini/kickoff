import { test, expect, type Page } from '@playwright/test';

async function signUp(page: Page) {
  const email = `e2e-admin-${Date.now()}@kickoff.test`;
  await page.goto('/login');
  await page.waitForFunction(() => {
    const el = document.querySelector('h1') ?? document.body;
    return Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 10_000 });
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Admin Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/competitions\//, { timeout: 15_000 });
}

test('unauthenticated visitor to /admin sees Unauthorized error', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
  await expect(page.getByText('Unauthorized')).toBeVisible();
});

test('authenticated non-admin user sees Forbidden error', async ({ page }) => {
  await signUp(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
  await expect(page.getByText('Forbidden')).toBeVisible();
});
