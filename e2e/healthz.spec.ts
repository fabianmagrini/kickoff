import { test, expect } from '@playwright/test';

test('GET /api/healthz returns 200 with ok: true', async ({ request }) => {
  const response = await request.get('/api/healthz');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
