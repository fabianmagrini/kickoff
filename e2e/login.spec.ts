import { test, expect, type Page } from '@playwright/test';

// React 18 attaches __reactFiber$* properties to DOM nodes when hydrated.
// Wait for this before interacting with client-side state.
async function waitForReactHydration(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('h1') ?? document.body;
    return Object.keys(el).some(key => key.startsWith('__reactFiber'));
  }, { timeout: 10_000 });
}

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
  await waitForReactHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create account');
  await expect(page.getByLabel('Name')).toBeVisible();
});

test('toggling back to sign-in hides the name field', async ({ page }) => {
  await page.goto('/login');
  await waitForReactHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create account');
  await page.getByRole('button').filter({ hasText: 'Sign in' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
  await expect(page.getByLabel('Name')).not.toBeVisible();
});

test('invalid credentials keep the user on the login page', async ({ page }) => {
  // Intercept only the sign-in POST to return a fast deterministic error.
  // The session GET (useSession on mount) is allowed through so hydration completes.
  await page.route('**/api/auth/**', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid email or password' }),
      });
    } else {
      route.continue();
    }
  });
  await page.goto('/login');
  await waitForReactHydration(page);
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 10_000 });
});

test('back link returns to home', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /back to kickoff/i }).click();
  await expect(page).toHaveURL('/');
});
