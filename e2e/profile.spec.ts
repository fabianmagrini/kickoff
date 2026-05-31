import { test, expect } from '@playwright/test';

test('unauthenticated visitor to /profile is redirected to /login', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
});

test('/login page is shown with the sign-in form after the redirect', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});
