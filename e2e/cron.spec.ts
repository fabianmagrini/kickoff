import { test, expect } from '@playwright/test';

test('POST /api/cron/score without secret returns 401', async ({ request }) => {
  const response = await request.post('/api/cron/score');
  expect(response.status()).toBe(401);
});

test('POST /api/cron/score with wrong secret returns 401', async ({ request }) => {
  const response = await request.post('/api/cron/score', {
    headers: { 'x-cron-secret': 'wrong-secret' },
  });
  expect(response.status()).toBe(401);
});
