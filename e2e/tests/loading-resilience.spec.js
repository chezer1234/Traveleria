// @ts-check
const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Regression tests for the "Loading your travel data… forever" bug
// (Safari iOS / second Chrome tab). Root causes and fix:
//
//   1. Safari Private Browsing has no OPFS, so installOpfsSAHPoolVfs rejected
//      ("Missing required OPFS APIs") — the worker now falls back to a
//      session-only in-memory DB. Playwright's Linux WebKit also lacks OPFS,
//      which makes the webkit project a faithful stand-in for that Safari mode.
//   2. The OPFS SAH pool holds exclusive locks on its files, so a second tab
//      (or a reload racing a not-yet-torn-down worker — Chrome only releases
//      orphaned handles on tab close, not reload) failed with "Access Handles
//      cannot be created…" — same fallback applies.
//   3. Every page rendered the loading spinner for ANY dbStatus !== 'ready',
//      so the 'error' state was indistinguishable from loading — Layout now
//      shows an error screen with a retry button instead.

function freshIdentifier(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

async function signupAndPlantToken(page, context, identifier, password, home_country) {
  const signup = await context.request.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password, home_country },
  });
  expect(signup.status()).toBe(201);
  const { user, token } = await signup.json();

  await page.addInitScript(({ token, identifier }) => {
    localStorage.setItem('traveleria.auth_token', token);
    localStorage.setItem('traveleria.last_identifier', identifier);
  }, { token, identifier: user.identifier });

  return user;
}

const readyProbe = () => {
  const t = /** @type {any} */ (window).__traveleria;
  return !!(t && t.ready);
};

test.describe('app loading resilience', () => {
  test('signed-in app reaches ready even when OPFS is unavailable or degraded', async ({ page, context, browserName }) => {
    const identifier = freshIdentifier('resil');
    await signupAndPlantToken(page, context, identifier, 'resilience-password-long', 'GB');

    await page.goto('/');
    await page.waitForFunction(readyProbe, null, { timeout: 20_000 });

    const probe = await page.evaluate(async () => {
      const t = /** @type {any} */ (window).__traveleria;
      return { storage: t.storage, countries: await t.countCountries() };
    });

    // Chromium has OPFS → persistent path; Linux WebKit has no OPFS at all
    // (like Safari Private Browsing) → the in-memory fallback must engage.
    expect(probe.storage).toBe(browserName === 'webkit' ? 'memory' : 'opfs');
    // Whatever the backend, hydration must have completed.
    expect(probe.countries).toBeGreaterThan(100);
    await expect(page.getByText('Loading your travel data')).toHaveCount(0);
  });

  test('a second tab loads instead of hanging on the locked SAH pool', async ({ context, browserName }) => {
    test.skip(browserName !== 'chromium', 'exercises the OPFS SAH pool lock, which needs a browser with OPFS');

    const identifier = freshIdentifier('twotab');
    const pageA = await context.newPage();
    await signupAndPlantToken(pageA, context, identifier, 'two-tab-password-long', 'FR');
    await pageA.goto('/');
    await pageA.waitForFunction(readyProbe, null, { timeout: 20_000 });

    // Tab A holds every SAH lock in the pool. Before the fallback, tab B's
    // open failed and the UI spun forever.
    const pageB = await context.newPage();
    await pageB.addInitScript(({ identifier }) => {
      localStorage.setItem('traveleria.last_identifier', identifier);
    }, { identifier });
    await pageB.goto('/');
    await pageB.waitForFunction(readyProbe, null, { timeout: 20_000 });

    const storages = {
      a: await pageA.evaluate(() => /** @type {any} */ (window).__traveleria.storage),
      b: await pageB.evaluate(() => /** @type {any} */ (window).__traveleria.storage),
    };
    expect(storages.a).toBe('opfs');
    expect(storages.b).toBe('memory');

    // The session-only tab tells the user why nothing will persist locally.
    await expect(pageB.getByRole('status')).toContainText("can't be stored on this device");

    // And tab A keeps working — B's failed grab must not disturb its pool.
    const aCountries = await pageA.evaluate(() => /** @type {any} */ (window).__traveleria.countCountries());
    expect(aCountries).toBeGreaterThan(100);

    await pageB.close();
    await pageA.close();
  });
});
