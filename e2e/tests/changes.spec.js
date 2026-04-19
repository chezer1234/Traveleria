// @ts-check
const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

function freshIdentifier(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

test('/api/snapshot returns reference data + a cursor', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${API_URL}/api/snapshot`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.countries)).toBe(true);
  expect(body.countries.length).toBeGreaterThan(100);
  expect(Array.isArray(body.cities)).toBe(true);
  expect(Array.isArray(body.provinces)).toBe(true);
  expect(Array.isArray(body.users_public)).toBe(true);
  expect(typeof body.cursor).toBe('number');

  // users_public must contain exactly the agreed minimal shape — nothing else.
  for (const u of body.users_public) {
    expect(Object.keys(u).sort()).toEqual(['home_country', 'id', 'identifier']);
  }
});

test('every write appends one row to _changes and surfaces via /api/changes', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('changes');

  // Capture the cursor BEFORE signup so we only need to scan forward.
  const preSnapshot = await ctx.get(`${API_URL}/api/snapshot`);
  const preCursor = (await preSnapshot.json()).cursor;

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'change-feed-test-password', home_country: 'GB' },
  });
  expect(signup.status()).toBe(201);
  const user = await signup.json();

  const addCountry = await ctx.post(`${API_URL}/api/users/${user.id}/countries`, {
    data: { country_code: 'JP' },
  });
  expect(addCountry.status()).toBe(201);
  const country = await addCountry.json();
  // Writes echo their change_id so clients can fast-forward cursors.
  expect(typeof country.change_id).toBe('number');

  const fetchChanges = await ctx.get(`${API_URL}/api/changes?since=${preCursor}`);
  expect(fetchChanges.status()).toBe(200);
  const { changes, cursor } = await fetchChanges.json();
  expect(cursor).toBeGreaterThan(preCursor);

  // Parallel workers will have stuffed other users' rows into the same window,
  // so filter to only the rows we care about by user_id / pk.
  const userRow = changes.find((c) => c.table === 'users' && c.pk === user.id);
  expect(userRow, 'users insert should be in the feed').toBeTruthy();
  expect(userRow.op).toBe('insert');
  expect(userRow.row.identifier).toBe(identifier);
  expect(userRow.row).not.toHaveProperty('password_hash');

  const visitRows = changes.filter(
    (c) => c.table === 'user_countries' && c.row && c.row.user_id === user.id
  );
  expect(visitRows).toHaveLength(1);
  expect(visitRows[0].op).toBe('insert');
  expect(visitRows[0].row.country_code).toBe('JP');
});

test('/api/changes rejects a negative cursor with 422', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${API_URL}/api/changes?since=-1`);
  expect(res.status()).toBe(422);
});

test('cascade delete emits one _changes row per cascaded row', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('cascade');

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'cascade-test-password-yes', home_country: 'FR' },
  });
  const user = await (await signup).json();

  // Add a country, then an in-country province visit so the cascade has something to do.
  await ctx.post(`${API_URL}/api/users/${user.id}/countries`, {
    data: { country_code: 'FR' },
  });

  // Find a province in FR to add.
  const snap = await (await ctx.get(`${API_URL}/api/snapshot`)).json();
  const frProvince = snap.provinces.find((p) => p.country_code === 'FR');
  expect(frProvince, 'fixture should include at least one FR province').toBeTruthy();

  await ctx.post(`${API_URL}/api/users/${user.id}/provinces`, {
    data: { province_code: frProvince.code },
  });

  const cursorBefore = (await (await ctx.get(`${API_URL}/api/snapshot`)).json()).cursor;

  const del = await ctx.delete(`${API_URL}/api/users/${user.id}/countries/FR`);
  expect(del.status()).toBe(200);

  const after = await (await ctx.get(`${API_URL}/api/changes?since=${cursorBefore}`)).json();
  // Expect at least: one province-visit delete + one country-visit delete.
  const deletes = after.changes.filter((c) => c.op === 'delete');
  expect(deletes.length).toBeGreaterThanOrEqual(2);
  expect(deletes.some((c) => c.table === 'user_provinces')).toBe(true);
  expect(deletes.some((c) => c.table === 'user_countries')).toBe(true);
});

test('/api/debug/metrics reports route timings in non-prod (dev stack)', async () => {
  // In the prod-build E2E stack NODE_ENV=production so the endpoint requires a
  // token. We don't ship one in E2E, so expect 404. The dev stack behaviour is
  // covered by the server jest suite.
  const ctx = await request.newContext();
  const res = await ctx.get(`${API_URL}/api/debug/metrics`);
  expect([200, 404]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body).toHaveProperty('schema_version');
    expect(body).toHaveProperty('routes');
    expect(body).toHaveProperty('changes');
  }
});
