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

test('GET /api/cron/score without Authorization header returns 401', async ({ request }) => {
  const response = await request.get('/api/cron/score');
  expect(response.status()).toBe(401);
});

test('GET /api/cron/score with wrong Bearer token returns 401', async ({ request }) => {
  const response = await request.get('/api/cron/score', {
    headers: { authorization: 'Bearer wrong-secret' },
  });
  expect(response.status()).toBe(401);
});

test('GET /api/cron/score with correct Bearer token returns 200', async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // skip if CRON_SECRET not set in test environment
  const response = await request.get('/api/cron/score', {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(response.status()).toBe(200);
});
