// @ts-check
const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

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
  return { user, token };
}

// Phase 5 — happy path. The optimistic row must be queryable BEFORE the server
// response resolves the mutate promise. We drive that by delaying the POST at
// the Playwright route boundary; during the delay the savepoint is open and a
// SELECT on the same worker connection should already see the new row.
test('optimistic add is visible while the server POST is still in flight', async ({ page, context }) => {
  const identifier = freshIdentifier('opt_ok');
  const { user } = await signupAndPlantToken(
    page, context, identifier, 'optimistic-test-password', 'GB',
  );

  await page.goto('/');
  await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });

  const cursorBefore = await page.evaluate(async () => (window).__traveleria.cursor());

  // Delay the POST for 600 ms so we have a generous window to observe the
  // open-savepoint state. Only this user's write is slowed — the sync poll and
  // snapshot are unaffected.
  await page.route('**/api/users/*/countries', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise((r) => setTimeout(r, 600));
    return route.continue();
  });

  const observed = await page.evaluate(async (uid) => {
    const t = (window).__traveleria;
    // Start the mutate but DON'T await yet — the savepoint is now open.
    const mutatePromise = t.addCountry('JP');

    // Give the worker ~50 ms to apply preSteps inside the savepoint, but not
    // enough for the 600 ms route delay to elapse.
    await new Promise((r) => setTimeout(r, 100));
    const rowsDuring = await t.query(
      `SELECT country_code FROM user_countries WHERE user_id = ?`,
      [uid],
    );

    // Now let the fetch finish and the savepoint RELEASE.
    const result = await mutatePromise;
    const rowsAfter = await t.query(
      `SELECT country_code FROM user_countries WHERE user_id = ?`,
      [uid],
    );
    return {
      during: rowsDuring.map((r) => r.country_code),
      after: rowsAfter.map((r) => r.country_code),
      change_id: result.body && result.body.change_id,
    };
  }, user.id);

  expect(observed.during, 'optimistic row must be visible while POST is pending')
    .toEqual(['JP']);
  expect(observed.after).toEqual(['JP']);
  expect(typeof observed.change_id).toBe('number');

  // Cursor fast-forwarded past the returned change_id so the next poll won't
  // re-apply our own echo.
  const cursorAfter = await page.evaluate(async () => (window).__traveleria.cursor());
  expect(cursorAfter).toBeGreaterThanOrEqual(observed.change_id);
  expect(cursorAfter).toBeGreaterThan(cursorBefore);
});

// Phase 5 — rollback path. If the server rejects the write, the savepoint must
// be rolled back so the local DB is clean. We drive this by blocking the HTTP
// request at the Playwright route level so no mutation can ever succeed — the
// worker sees a network failure and must ROLLBACK TO + RELEASE the savepoint.
test('network failure rolls back the optimistic write cleanly', async ({ page, context }) => {
  const identifier = freshIdentifier('opt_roll');
  const { user } = await signupAndPlantToken(
    page, context, identifier, 'optimistic-test-password', 'GB',
  );

  await page.goto('/');
  await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });

  // Block the write route for the rest of this test. Reference-data GETs and
  // the sync /api/changes poll keep working.
  await page.route('**/api/users/*/countries', (route) => {
    if (route.request().method() === 'POST') return route.abort();
    return route.continue();
  });

  const outcome = await page.evaluate(async (uid) => {
    const t = (window).__traveleria;
    let rejected = false;
    let message = null;
    try {
      await t.addCountry('DE');
    } catch (err) {
      rejected = true;
      message = err && err.message;
    }
    const rows = await t.query(
      `SELECT country_code FROM user_countries WHERE user_id = ?`,
      [uid],
    );
    return { rejected, message, localCodes: rows.map((r) => r.country_code) };
  }, user.id);

  expect(outcome.rejected, 'mutate should reject when the network call fails').toBe(true);
  expect(outcome.localCodes, 'savepoint should have rolled the optimistic row back').toEqual([]);

  // Server side: nothing was written, so /api/changes since 0 should not carry
  // a user_countries insert for this user.
  const since = await context.request.get(`${API_URL}/api/changes?since=0`);
  const { changes } = await since.json();
  const ours = changes.filter(
    (c) => c.table === 'user_countries' && c.row && c.row.user_id === user.id,
  );
  expect(ours).toEqual([]);
});
