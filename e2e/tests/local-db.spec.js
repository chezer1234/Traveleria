// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Keep prefixes short — the Phase-0 handle regex caps identifiers at 32 chars.
function freshIdentifier(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

// Sign up via the API, then plant the bearer token in the page's localStorage
// before the React app boots. AuthContext picks it up and calls openUserDb.
async function signupAndPlantToken(page, context, identifier, password, home_country) {
  const signup = await context.request.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password, home_country },
  });
  expect(signup.status()).toBe(201);
  const { user, token } = await signup.json();

  // The app reads localStorage during AuthContext mount, so we need to set it
  // before the JS runs. addInitScript runs BEFORE every navigation's scripts.
  await page.addInitScript(({ token, identifier }) => {
    localStorage.setItem('traveleria.auth_token', token);
    localStorage.setItem('traveleria.last_identifier', identifier);
  }, { token, identifier: user.identifier });

  return user;
}

// OPFS requires a secure context. Playwright runs on the host and points at
// localhost:3000, which Chromium always treats as secure — so these tests
// exercise the real sqlite-wasm + OPFS path with no TLS or flags.
test.describe('local OPFS DB hydration', () => {
  test('after signin, reference data lands in the browser SQLite via /api/snapshot', async ({ page, context }) => {
    const identifier = freshIdentifier('opfs');

    // Surface browser-side errors so a failing OPFS init doesn't time out silently.
    const consoleLines = [];
    page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

    await signupAndPlantToken(page, context, identifier, 'opfs-test-password-long-enough', 'GB');

    // Loading the app triggers AuthContext → /api/auth/me (with the bearer)
    // → openUserDb → /api/snapshot.
    await page.goto('/');

    await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
    void consoleLines;

    const probe = await page.evaluate(async () => {
      const t = (window).__traveleria;
      return {
        schema: t.schemaVersion,
        countries: await t.countCountries(),
        cities: await t.countCities(),
        provinces: await t.countProvinces(),
        cursor: await t.cursor(),
        userId: t.userId,
      };
    });

    expect(probe.schema).toBeTruthy();
    expect(probe.countries).toBeGreaterThan(100);
    expect(probe.cities).toBeGreaterThan(100);
    expect(probe.provinces).toBeGreaterThan(100);
    expect(typeof probe.cursor).toBe('number');
    expect(probe.userId).toBeTruthy();
  });

  test('OPFS DB persists across reloads (no second snapshot fetch)', async ({ page, context }) => {
    const identifier = freshIdentifier('opfs_persist');

    await signupAndPlantToken(page, context, identifier, 'opfs-persist-password-long', 'FR');

    await page.goto('/');
    await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
    const firstCursor = await page.evaluate(async () => (window).__traveleria.cursor());

    // Second load. Same browser context → same OPFS partition → hydrate short-circuits.
    let snapshotCalls = 0;
    page.on('request', (req) => {
      if (req.url().endsWith('/api/snapshot')) snapshotCalls += 1;
    });
    await page.reload();
    await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
    const secondCursor = await page.evaluate(async () => (window).__traveleria.cursor());

    // Cursor must not REGRESS across reloads (that would indicate hydration
    // reset the _meta). It may ADVANCE — with the Phase 3 sync worker live,
    // parallel test workers' writes tick the cursor forward between captures.
    // The invariant this test really cares about is "no re-snapshot", asserted
    // below.
    expect(secondCursor).toBeGreaterThanOrEqual(firstCursor);
    expect(snapshotCalls, 'hydration must short-circuit on a warm OPFS').toBe(0);
  });
});
