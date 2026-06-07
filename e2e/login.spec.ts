import { test, expect, type Page } from '@playwright/test';

// React 18 attaches __reactFiber$* properties to DOM nodes when hydrated.
// Wait for this before interacting with client-side state.
async function waitForReactHydration(page: Page) {
  // React attaches __react* internal properties to DOM nodes when hydrated.
  // Using the broader `__react` prefix is more resilient across React versions
  // than pinning to `__reactFiber` (which is an implementation detail).
  await page.waitForFunction(() => {
    const el = document.querySelector('h1') ?? document.body;
    return Object.keys(el).some(key => key.startsWith('__react'));
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
  // The error message surfaced from the mocked 401 response must be visible
  await expect(page.locator('form p')).toBeVisible();
});

test('back link returns to home', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /back to kickoff/i }).click();
  // / redirects to the active competition dashboard
  await expect(page).toHaveURL(/\/(competitions\/)?/);
});

test('successful sign-up redirects to home and shows user name in navbar', async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@kickoff.test`;
  await page.goto('/login');
  await waitForReactHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Nav Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Full-page reload after sign-up means SSR serves the session from first paint.
  await page.waitForURL(/\/competitions\//, { timeout: 15_000 });
  await expect(page.locator('nav')).toContainText('Nav Test User', { timeout: 5_000 });
});

test('sign out clears the session and shows sign-in link', async ({ page }) => {
  // Sign up first to get an authenticated session.
  const email = `e2e-signout-${Date.now()}@kickoff.test`;
  await page.goto('/login');
  await waitForReactHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Signout User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/competitions\//, { timeout: 15_000 });
  await expect(page.locator('nav')).toContainText('Signout User', { timeout: 5_000 });

  // Sign out — full reload means SSR returns the unauthenticated state.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/competitions\//, { timeout: 10_000 });
  await expect(page.locator('nav')).toContainText('Sign in', { timeout: 5_000 });
  await expect(page.locator('nav')).not.toContainText('Signout User');
});
