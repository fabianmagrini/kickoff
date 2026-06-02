import { test, expect, type Page } from '@playwright/test';

// One fresh user per test-run so no prior tips exist on any match.
const TEST_EMAIL = `e2e-tip-${Date.now()}@kickoff.test`;
const TEST_PASSWORD = 'TestPass123!';

async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('h1') ?? document.body;
    return Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 10_000 });
}

/**
 * Authenticate via the login form. Tries sign-in first (fast path for tests
 * 2+ in a run where the user already exists), falls back to sign-up.
 */
async function authenticate(page: Page) {
  await page.goto('/login');
  await waitForHydration(page);

  // Fast path: sign-in (works for all tests after the first in a run).
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await Promise.race([
    page.waitForURL('/', { timeout: 5_000 }),
    page.waitForSelector('.text-destructive', { timeout: 5_000 }),
  ]).catch(() => {});

  if (new URL(page.url()).pathname === '/') return;

  // Slow path: user doesn't exist yet — sign up.
  await page.goto('/login');
  await waitForHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill('E2E Test');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}

/** Navigate to the first scheduled match. Returns false if none are seeded. */
async function goToScheduledMatch(page: Page): Promise<boolean> {
  await page.goto('/matches');
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  if (await link.count() === 0) return false;
  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await expect(page.getByRole('heading', { name: /your tip/i })).toBeVisible();
  return true;
}

test('unauthenticated user sees sign-in prompt on a scheduled match', async ({ page }) => {
  await page.goto('/matches');
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  test.skip(await link.count() === 0, 'No scheduled matches — run npm run db:seed:dev');

  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await expect(page.getByText('Sign in to submit a tip')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', /\/login/);
});

test('sign-in prompt link navigates to the login page', async ({ page }) => {
  await page.goto('/matches');
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  test.skip(await link.count() === 0, 'No scheduled matches — run npm run db:seed:dev');

  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/login');
});

test('authenticated user sees score inputs and the submit button', async ({ page }) => {
  await authenticate(page);
  const hasMatch = await goToScheduledMatch(page);
  test.skip(!hasMatch, 'No scheduled matches — run npm run db:seed:dev');

  const inputs = page.locator('input[type="number"]');
  await expect(inputs.nth(0)).toBeVisible({ timeout: 5_000 });
  await expect(inputs).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Lock in Tip' })).toBeVisible();
});

test('submit button stays disabled until both scores are filled', async ({ page }) => {
  await authenticate(page);
  const hasMatch = await goToScheduledMatch(page);
  test.skip(!hasMatch, 'No scheduled matches — run npm run db:seed:dev');

  const inputs = page.locator('input[type="number"]');
  await expect(inputs.nth(0)).toBeVisible({ timeout: 5_000 });

  const button = page.getByRole('button', { name: 'Lock in Tip' });
  await expect(button).toBeDisabled();
  await inputs.nth(0).fill('2');
  await expect(button).toBeDisabled(); // still needs away score
  await inputs.nth(1).fill('1');
  await expect(button).toBeEnabled();
});

test('submitted tip appears optimistically before the server responds', async ({ page }) => {
  await authenticate(page);

  // Delay submitTipFn POST by 1.5 s then return 500. The delay lets us assert
  // the optimistic state while the request is in flight; the 500 avoids
  // creating a real tip that would break the rollback test.
  await page.route('**/_serverFn/**', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise(r => setTimeout(r, 1500));
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    } else {
      await route.continue();
    }
  });

  const hasMatch = await goToScheduledMatch(page);
  test.skip(!hasMatch, 'No scheduled matches — run npm run db:seed:dev');

  const inputs = page.locator('input[type="number"]');
  await expect(inputs.nth(0)).toBeVisible({ timeout: 5_000 });
  await inputs.nth(0).fill('2');
  await inputs.nth(1).fill('1');
  await page.getByRole('button', { name: 'Lock in Tip' }).click();

  // Optimistic update must appear within the 1.5 s window.
  await expect(page.getByText('Your tip: 2 – 1')).toBeVisible({ timeout: 500 });
  await expect(page.getByText('Tips are locked once submitted.')).toBeVisible();
});

test('rolls back to the form and shows an error when submission fails', async ({ page }) => {
  await authenticate(page);

  await page.route('**/_serverFn/**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    } else {
      await route.continue();
    }
  });

  const hasMatch = await goToScheduledMatch(page);
  test.skip(!hasMatch, 'No scheduled matches — run npm run db:seed:dev');

  const inputs = page.locator('input[type="number"]');
  await expect(inputs.nth(0)).toBeVisible({ timeout: 5_000 });
  await inputs.nth(0).fill('3');
  await inputs.nth(1).fill('0');
  await page.getByRole('button', { name: 'Lock in Tip' }).click();

  // Form must be restored and an error message shown after rollback.
  await expect(page.getByRole('button', { name: 'Lock in Tip' })).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.text-destructive')).toBeVisible();
});
