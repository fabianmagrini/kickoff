import { test, expect } from '@playwright/test';

test('login page renders the sign-in form by default', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('login page shows OAuth provider buttons', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
});

test('toggling to sign-up mode shows the name field and changes the heading', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();
});

test('toggling back to sign-in hides the name field', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Name')).not.toBeVisible();
});

test('invalid credentials show an error message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Better Auth returns an error for unknown credentials; the form renders it in a red paragraph
  await expect(page.locator('p.text-destructive')).toBeVisible({ timeout: 10_000 });
});

test('back link returns to home', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /back to kickoff/i }).click();
  await expect(page).toHaveURL('/');
});
