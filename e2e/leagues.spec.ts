import { test, expect, type Page } from '@playwright/test';

async function signUp(page: Page, name: string) {
  const email = `e2e-leagues-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@kickoff.test`;
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

async function getCompetitionId(page: Page): Promise<string> {
  await page.goto('/');
  await page.waitForURL(/\/competitions\/.+/, { timeout: 10_000 });
  const match = page.url().match(/\/competitions\/([^/]+)/);
  if (!match) throw new Error('Could not extract competitionId from URL');
  return match[1];
}

test('unauthenticated visitor to /competitions/:id/leagues is redirected to /login', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leagues`);
  await expect(page).toHaveURL('/login');
});

test('unauthenticated visitor to /competitions/:id/leagues/join is redirected to /login', async ({ page }) => {
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leagues/join`);
  await expect(page).toHaveURL('/login');
});

test('authenticated user sees Leagues heading and empty state', async ({ page }) => {
  await signUp(page, 'League Viewer');
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leagues`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: 'Leagues' })).toBeVisible();
  await expect(page.getByText(/not in any leagues yet/i)).toBeVisible();
});

test('authenticated user can create a league and is navigated to it', async ({ page }) => {
  await signUp(page, 'League Creator');
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leagues`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '+ New league' }).click();
  await page.getByPlaceholder('League name').fill('Test League');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.waitForURL(/\/competitions\/.+\/leagues\/.+/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Test League' })).toBeVisible();
  await expect(page.getByText(/invite code/i)).toBeVisible();
  // Creator is automatically added as first member
  await expect(
    page.locator('.border.p-4.rounded-xl').filter({ hasText: 'League Creator' }),
  ).toBeVisible();
});

test('join page shows the form and rejects an invalid invite code', async ({ page }) => {
  await signUp(page, 'League Joiner');
  const competitionId = await getCompetitionId(page);
  await page.goto(`/competitions/${competitionId}/leagues/join`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: 'Join a League' })).toBeVisible();

  await page.getByLabel('Invite code').fill('BADCODE');
  await page.getByRole('button', { name: 'Join league' }).click();
  await expect(page.getByText('League not found')).toBeVisible({ timeout: 5_000 });
});

test('Competitions link appears in the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Competitions' })).toBeVisible();
});
