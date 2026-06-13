// @ts-check
// Reproduction for issue #27 — "Different users see different leaderboard results".
//
// Root cause hypothesis: subregion claim/unclaim (POST/DELETE
// /api/users/:id/subregions, added in PR #26) never write to the `_changes`
// feed, and the client sync worker's TABLE_MAP omits `user_subregions`. So a
// freshly-hydrated client picks up everyone's claims from /api/snapshot, but an
// already-hydrated client never receives them via /api/changes polling — its
// leaderboard drifts (e.g. ross shows 1423.3 instead of 1825.3).
//
// These tests assert the CORRECT behaviour, so they FAIL on the buggy code and
// pass once subregion writes are logged to _changes and applied by the worker.
const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

function freshIdentifier(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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

// ── Server side: the change must land in the feed ────────────────────────────
test('claiming a subregion appends a row to _changes and surfaces via /api/changes', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('subclaim');

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'subregion-feed-test-password', home_country: 'GB' },
  });
  expect(signup.status()).toBe(201);
  const { user, token } = await signup.json();
  const auth = { Authorization: `Bearer ${token}` };

  // Capture the cursor right before the claim so we only scan forward.
  const preCursor = (await (await ctx.get(`${API_URL}/api/snapshot`)).json()).cursor;

  const claim = await ctx.post(`${API_URL}/api/users/${user.id}/subregions`, {
    data: { subregion: 'Western Europe' },
    headers: auth,
  });
  expect(claim.status()).toBe(201);
  // Like every other write, the claim should echo a change_id.
  const claimBody = await claim.json();
  expect(typeof claimBody.change_id).toBe('number');

  const { changes } = await (await ctx.get(`${API_URL}/api/changes?since=${preCursor}`)).json();
  const claimRows = changes.filter(
    (c) => c.table === 'user_subregions' && c.row && c.row.user_id === user.id,
  );
  expect(claimRows, 'subregion claim should appear in the changes feed').toHaveLength(1);
  expect(claimRows[0].op).toBe('insert');
  expect(claimRows[0].row.subregion).toBe('Western Europe');

  // Unclaim must also propagate as a delete.
  const cursorBeforeDelete = (await (await ctx.get(`${API_URL}/api/snapshot`)).json()).cursor;
  const unclaim = await ctx.delete(
    `${API_URL}/api/users/${user.id}/subregions/${encodeURIComponent('Western Europe')}`,
    { headers: auth },
  );
  expect(unclaim.status()).toBe(204);
  const afterDelete = await (await ctx.get(`${API_URL}/api/changes?since=${cursorBeforeDelete}`)).json();
  const deleteRows = afterDelete.changes.filter(
    (c) => c.table === 'user_subregions' && c.op === 'delete',
  );
  expect(deleteRows.length, 'subregion unclaim should appear in the changes feed').toBeGreaterThanOrEqual(1);
});

// ── End-to-end: two browsers must converge (the actual leaderboard drift) ─────
test("a subregion claim in browser A surfaces in browser B via incremental sync", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  try {
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const idA = freshIdentifier('subA');
    const idB = freshIdentifier('subB');

    const { user: userA, token: tokenA } = await signupAndPlantToken(
      pageA, ctxA, idA, 'sub-sync-test-password', 'GB',
    );
    await signupAndPlantToken(pageB, ctxB, idB, 'sub-sync-test-password', 'FR');

    await pageA.goto('/');
    await pageB.goto('/');
    await pageA.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
    await pageB.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });

    // A claims a subregion via REST (the only write path).
    const claim = await ctxA.request.post(`${API_URL}/api/users/${userA.id}/subregions`, {
      data: { subregion: 'Western Europe' },
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(claim.status()).toBe(201);

    // B (already hydrated) must pick up A's claim via the 5s changes poll.
    const deadline = Date.now() + 15_000;
    let rows = [];
    while (Date.now() < deadline) {
      rows = await pageB.evaluate(
        async (uid) =>
          (window).__traveleria.query(
            `SELECT subregion FROM user_subregions WHERE user_id = ?`,
            [uid],
          ),
        userA.id,
      );
      if (rows.length > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(rows.map((r) => r.subregion), "B should have A's subregion claim within 15s")
      .toEqual(['Western Europe']);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
