// @ts-check
const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Phase A's smoke test is intentionally minimal: prove the whole prod-build stack boots,
// the API reports healthy, and the client bundle renders. Phase 0 will extend this with
// a signup → add-country flow, and Phase 2 will assert the OPFS DB gets populated.

test('API /api/health reports connected and stamps a schema version', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${API_URL}/api/health`);
  expect(res.ok()).toBeTruthy();

  const schemaVersion = res.headers()['x-app-schema-version'];
  expect(schemaVersion).toBeTruthy();
  expect(schemaVersion).not.toBe('');

  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.db).toBe('connected');
  expect(typeof body.countries).toBe('number');
  expect(body.countries).toBeGreaterThan(100);
});

test('client bundle loads and the root HTML serves COOP/COEP headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response, 'navigation response').not.toBeNull();
  if (!response) return;
  expect(response.ok(), `got status ${response.status()}`).toBeTruthy();

  const headers = response.headers();
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['cross-origin-embedder-policy']).toBe('require-corp');

  await expect(page.locator('#root')).toBeVisible();
});
