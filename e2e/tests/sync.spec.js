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

// Phase 3 exit criterion: "two browsers converge within 5–10 s of any write."
// Two distinct browser contexts with distinct users. A writes via REST; B's
// sync worker must pick it up via /api/changes polling within ~15 s (one poll
// plus test jitter headroom). Tests the changes feed end-to-end.
test('write in browser A surfaces in browser B via incremental sync', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  try {
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const idA = freshIdentifier('syncA');
    const idB = freshIdentifier('syncB');

    const { user: userA, token: tokenA } = await signupAndPlantToken(
      pageA, ctxA, idA, 'sync-test-password-long', 'GB',
    );
    await signupAndPlantToken(pageB, ctxB, idB, 'sync-test-password-long', 'FR');

    await pageA.goto('/');
    await pageB.goto('/');
    await pageA.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
    await pageB.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });

    // A writes via the REST path (the only write path, by invariant).
    const add = await ctxA.request.post(`${API_URL}/api/users/${userA.id}/countries`, {
      data: { country_code: 'JP' },
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(add.status()).toBe(201);

    // Poll B's local DB for A's row. Budget = 15 s: the worker polls every 5 s,
    // plus generous headroom for test runner jitter.
    const deadline = Date.now() + 15_000;
    let rows = [];
    while (Date.now() < deadline) {
      rows = await pageB.evaluate(
        async (uid) =>
          (window).__traveleria.query(
            `SELECT country_code FROM user_countries WHERE user_id = ?`,
            [uid],
          ),
        userA.id,
      );
      if (rows.length > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(rows.map((r) => r.country_code), "B should have A's JP visit within 15s")
      .toEqual(['JP']);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
