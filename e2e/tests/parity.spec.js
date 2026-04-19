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

async function addCountries(ctx, userId, token, codes) {
  for (const code of codes) {
    const r = await ctx.request.post(`${API_URL}/api/users/${userId}/countries`, {
      data: { country_code: code },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(201);
  }
}

// Wait until the local DB has synced every code in `codes` for userId. The
// server has them (we just POSTed); we're waiting on the sync worker poll.
async function waitForLocalCountries(page, userId, codes) {
  const wanted = new Set(codes);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const rows = await page.evaluate(
      async (uid) =>
        (window).__traveleria.query(
          `SELECT country_code FROM user_countries WHERE user_id = ?`,
          [uid],
        ),
      userId,
    );
    const have = new Set(rows.map((r) => r.country_code));
    if ([...wanted].every((c) => have.has(c))) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`local DB never synced ${[...wanted].join(',')} for user ${userId}`);
}

// Phase 4 exit criterion: scoring parity. The client now computes the total
// from its local SQLite via client/src/lib/points.js. The server still serves
// /api/users/:id/score for exactly this comparison. For a fixed set of visits
// against a known home country, the two must agree to the cent.
test('client scoring matches server /score for a fixed visit fixture', async ({ page, context }) => {
  const identifier = freshIdentifier('parS');
  const { user, token } = await signupAndPlantToken(
    page, context, identifier, 'parity-test-password-long', 'GB',
  );

  // Mixed tier fixture: microstate, Tier 1, Tier 2, Tier 3, a hard-to-visit
  // one, and a small-area one. Deliberately varied to exercise more code
  // paths than just "France from GB".
  const codes = ['FR', 'DE', 'JP', 'US', 'KP', 'IS', 'VA', 'AU', 'LA', 'PT'];
  await addCountries(context, user.id, token, codes);

  await page.goto('/');
  await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });

  // Wait for the sync worker to catch up before asking the client for a score.
  await waitForLocalCountries(page, user.id, codes);

  // Server-computed total.
  const server = await context.request.get(
    `${API_URL}/api/users/${user.id}/score?home_country=${user.home_country}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(server.status()).toBe(200);
  const serverBody = await server.json();

  // Client-computed total via the same helper the Dashboard page uses.
  const clientTotal = await page.evaluate(async (homeCountry) => {
    const r = await (window).__traveleria.computeScore(homeCountry);
    return r.totalPoints;
  }, user.home_country);

  expect(clientTotal).toBeCloseTo(serverBody.totalPoints, 1);
});

// Phase 4 exit criterion (bonus): leaderboard parity. Same shape check against
// the server's /api/leaderboard. We sort and compare by (user_id, total_points)
// so the rank tie-breaking is deterministic even when workers write in parallel.
test('client leaderboard matches server /leaderboard', async ({ page, context }) => {
  const identifier = freshIdentifier('parL');
  const { user, token } = await signupAndPlantToken(
    page, context, identifier, 'parity-test-password-long', 'FR',
  );

  await addCountries(context, user.id, token, ['GB', 'DE', 'JP']);

  await page.goto('/');
  await page.waitForFunction(() => !!(window).__traveleria?.ready, null, { timeout: 20_000 });
  await waitForLocalCountries(page, user.id, ['GB', 'DE', 'JP']);

  const server = await context.request.get(`${API_URL}/api/leaderboard`);
  expect(server.status()).toBe(200);
  const serverRows = await server.json();

  const clientRows = await page.evaluate(async () => {
    return (window).__traveleria.computeLeaderboard(null);
  });

  // Restrict to our freshly-created user to make the assertion resilient to
  // parallel-worker writes in the same changes window.
  const ours = (rows) => rows.find((r) => r.user_id === user.id);
  const srv = ours(serverRows);
  const cli = ours(clientRows);
  expect(srv, 'server should have our user on the leaderboard').toBeTruthy();
  expect(cli, 'client should have our user on the leaderboard').toBeTruthy();
  expect(cli.total_points).toBeCloseTo(srv.total_points, 1);
  expect(cli.countries_visited).toBe(srv.countries_visited);
});
