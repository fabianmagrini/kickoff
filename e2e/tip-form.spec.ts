/**
 * TipForm E2E tests.
 *
 * NOTE — authenticated tests are currently skipped because Better Auth's
 * session cookie is not being emitted in the E2E environment:
 *
 *   - The /api/auth/$ catch-all route returns the full TanStack Start HTML
 *     page instead of a raw API response, so auth.handler(request) runs but
 *     tanstackStartCookies' setCookie() call has no effect on the response.
 *   - As a result sign-up and sign-in appear to succeed (redirect to /) but
 *     leave no session cookie, so subsequent requests are unauthenticated.
 *
 * Fix required before enabling the skipped tests:
 *   - Replace createFileRoute('/api/auth/$') with TanStack Start's API-route
 *     mechanism so that auth.handler(request) response is passed through
 *     directly (with its Set-Cookie headers) rather than wrapped in HTML.
 *
 * Tracking: see docs/backlog.md — "tip-form.tsx E2E Tests"
 */
import { test, expect } from '@playwright/test';

test('unauthenticated user sees sign-in prompt on a scheduled match', async ({ page }) => {
  await page.goto('/matches');
  const link = page.locator('a[href^="/matches/"]').filter({ hasText: 'vs' }).first();
  test.skip(await link.count() === 0, 'No scheduled matches — run npm run db:seed:dev');

  await link.click();
  await page.waitForURL(/\/matches\/.+/);
  await expect(page.getByText('Sign in to submit a tip')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
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

// The tests below require a working auth session.
// They are skipped until the /api/auth/$ route is fixed to return raw responses.

test.skip('authenticated user sees score inputs and the submit button', async ({ page }) => {
  // Requires: fix /api/auth/$ to emit session cookies
  void page;
});

test.skip('submit button stays disabled until both scores are filled', async ({ page }) => {
  // Requires: fix /api/auth/$ to emit session cookies
  void page;
});

test.skip('submitted tip appears optimistically before the server responds', async ({ page }) => {
  // Requires: fix /api/auth/$ to emit session cookies
  void page;
});

test.skip('rolls back to the form and shows an error when submission fails', async ({ page }) => {
  // Requires: fix /api/auth/$ to emit session cookies
  void page;
});
