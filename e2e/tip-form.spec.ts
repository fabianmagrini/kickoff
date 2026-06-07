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

async function getCompetitionId(page: Page): Promise<string> {
  await page.goto('/');
  await page.waitForURL(/\/competitions\/.+/, { timeout: 10_000 });
  const match = page.url().match(/\/competitions\/([^/]+)/);
  if (!match) throw new Error('Could not extract competitionId from URL');
  return match[1];
}

/**
 * Authenticate via the login form. Tries sign-in first (fast path for tests
 * 2+ in a run where the user already exists), falls back to sign-up.
 */
async function authenticate(page: Page) {
  await page.goto('/login');
  await waitForHydration(page);

  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await Promise.race([
    page.waitForURL(/\/competitions\/.+/, { timeout: 5_000 }),
    page.waitForSelector('.text-destructive', { timeout: 5_000 }),
  ]).catch(() => {});

  if (/\/competitions\//.test(page.url())) return;

  // Slow path: user doesn't exist yet — sign up.
  await page.goto('/login');
  await waitForHydration(page);
  await page.getByRole('button').filter({ hasText: 'Sign up' }).click();
  await page.getByLabel('Name').fill('E2E Test');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/competitions\/.+/, { timeout: 10_000 });
}

/** Navigate to the first scheduled match. Returns false if none are seeded. */
async function goToScheduledMatch(page: Page): Promise<boolean> {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/matches`);
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  if (await link.count() === 0) return false;
  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await expect(page.getByRole('heading', { name: /your tip/i })).toBeVisible();
  await page.waitForLoadState('networkidle');
  return true;
}

test('unauthenticated user sees sign-in prompt on a scheduled match', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/matches`);
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  test.skip(await link.count() === 0, 'No scheduled matches — run npm run db:seed:dev');

  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await expect(page.getByText('Sign in to submit a tip')).toBeVisible();
  await expect(
    page.locator('div:has-text("Sign in to submit a tip")').getByRole('link', { name: 'Sign in' })
  ).toHaveAttribute('href', /\/login/);
});

test('sign-in prompt link navigates to the login page', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/matches`);
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
  await expect(button).toBeDisabled();
  await inputs.nth(1).fill('1');
  await expect(button).toBeEnabled();
});

test('submitted tip appears optimistically before the server responds', async ({ page }) => {
  await authenticate(page);

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

  await expect(page.getByRole('button', { name: 'Lock in Tip' })).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.text-destructive')).toBeVisible();
});

test('successful submission locks the form and persists after reload', async ({ page }) => {
  await authenticate(page);
  const hasMatch = await goToScheduledMatch(page);
  test.skip(!hasMatch, 'No scheduled matches — run npm run db:seed:dev');

  const matchUrl = page.url();
  const inputs = page.locator('input[type="number"]');
  await expect(inputs.nth(0)).toBeVisible({ timeout: 5_000 });
  await inputs.nth(0).fill('1');
  await inputs.nth(1).fill('0');
  await page.getByRole('button', { name: 'Lock in Tip' }).click();

  await expect(page.getByText('Your tip: 1 – 0')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Tips are locked once submitted.')).toBeVisible();

  await page.goto(matchUrl);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Your tip: 1 – 0')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('input[type="number"]')).toHaveCount(0);
});
