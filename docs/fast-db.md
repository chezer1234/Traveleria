# Fast DB: Client-Hosted Turso with Lazy Sync

**Status:** Thinking / spitball
**Date:** 2026-04-18
**Branch:** `claude/turso-architecture-plan-fQNFT`

> Spitball doc. Nothing here is committed to yet. Goal is to get Charlie and Lewis to a decision on whether this is worth chasing, and to flush out the open questions before anyone writes code.

---

## The itch

Every meaningful action in TravelPoints — adding a country, toggling a province, opening the dashboard, viewing a country detail — costs a round trip to the API and then a follow-up refetch. On a good connection from London that's ~300–500ms of latency before the UI updates. On mobile or a flaky hotel wifi it's worse. The scoring logic is pure JS (`server/src/lib/points.js`) but it only runs on the server, so the client has to wait for the server to load every country + every province + every user visit for every score recompute.

The data we're shuttling around is mostly **static seed data** that never changes from one user to the next:

- `countries` (~195 rows, tiny)
- `cities` (~300 rows)
- `provinces` (~900 rows)

And the **user-specific writable data** is tiny too:

- `user_countries` (one row per visited country — most users will have <50)
- `user_cities` (one row per visited city)
- `user_provinces` (one row per visited province)

That's a total footprint per user of, generously, a few hundred rows. We are doing real-time server-side joins over a static dataset to compute a score that depends on ~50 rows a user owns. That's the mismatch.

## What "fast" would feel like

- Tap "Add Turkmenistan" — points update the instant your finger lifts. No spinner. No "Saving...".
- Open the dashboard — it's already there, rendered from local data. Sync happens in the background to pick up anything changed elsewhere.
- Offline on a plane? The app still works. Add countries as you go. Syncs when you land.
- Score recalcs are instant because `points.js` runs against a local SQLite DB over WASM, not across a network.

## The proposed shape

Two databases on the client, both SQLite, both accessed via libSQL:

### 1. The **World DB** — read-only, shared

Contains all the seed data: `countries`, `cities`, `provinces`. Identical for every user. Small enough (<2MB uncompressed, probably <500KB gzipped) to ship as a static artefact.

Options for delivery:

- **A) Static asset:** Build the SQLite file at CI time from seeds, serve it from the static site (Render). Client fetches once, stores in OPFS, re-fetches on etag change.
- **B) Turso read-replica:** A single shared Turso DB that the browser opens as a read-only embedded replica via `@libsql/client-wasm`. Client never writes to it. Sync pulls changes when seed data updates.

Option A is simpler, cheaper, and the seed data almost never changes. Option B gives us a path to lazy-load segments (e.g. only pull province data when a Tier-1 country is opened) — probably overkill for 900 rows.

**Recommendation:** start with A, reassess if the world dataset ever gets large (e.g. adding rich country metadata, images, descriptions).

### 2. The **User writes** — single shared DB, token-scoped

**Update (Charlie's suggestion, 2026-04-18):** we don't need a whole database per user. We need a *writable surface* per user. The simpler shape is one shared Turso DB where every user can only write their own rows, enforced by the token they're given.

Two ways to express that, both on the table for evaluation:

- **A) Shared table + row-level security.** A single `user_visits` table keyed by `user_id`. Turso mints tokens with a `user_id` claim, and an auth policy restricts INSERT/UPDATE/DELETE to rows where `user_id = auth.user_id`. Reads can be policy-scoped the same way or left open (leaderboard reads benefit from open reads).
- **B) Table-per-user.** On signup, the API issues `CREATE TABLE user_<id>_visits (...)` and mints a token scoped to that table name. No RLS needed. Downside: leaderboard reads become a `UNION` across N tables or require a materialised summary.

Option A is strictly nicer if Turso's RLS story is mature enough. Need to validate: (1) does libSQL expose `auth.<claim>` in SQL policies today? (2) can we mint per-user JWTs with those claims from a lightweight endpoint? (3) what's the sync story — does embedded-replica filter rows by token, or does the client pull the whole table?

**Auth flow (both options):** user signs in → server session validates identity → server calls Turso admin API to mint a short-lived JWT with `{user_id: <uuid>}` → client gets the token + DB URL. Token refresh is a plain endpoint.

**Client-side cache — simpler than embedded replica.** Because the writable dataset is tiny (< a few hundred rows per user), we don't actually need full-DB sync. The client can:

1. On login, `SELECT * FROM user_visits WHERE user_id = me` once into local state (or an OPFS-backed sql.js cache).
2. Treat writes as local-first: update local state, then `INSERT ... ON CONFLICT DO NOTHING` against Turso over HTTP. Fire-and-forget with a retry queue.
3. On focus / reconnect, re-pull my rows to pick up anything from other devices.

This kills the need for `@libsql/client-wasm`'s sync machinery entirely. We still use WASM SQLite for the **World DB** (to run the scoring engine against static data), but the user data can be plain JS state + HTTP round trips to Turso, which is trivially robust and well-supported today.

### 2b. The **User DB** — per-user, read/write, bidirectional sync *(original proposal, kept for comparison)*

One Turso database per signed-in user, containing that user's `user_countries`, `user_cities`, `user_provinces`, and a cached copy of their `users` row.

The browser opens it as a **libSQL embedded replica** via `@libsql/client-wasm`:

- Reads hit the local WASM SQLite — synchronous, microseconds.
- Writes go to the local DB **and** queue for push to Turso. App code never awaits the network.
- `db.sync()` is called on app load, on focus, and after each write (lazy, fire-and-forget).

**Auth & isolation:** each user's DB URL + short-lived auth token comes from a tiny auth endpoint (`POST /api/sync-token`) that validates the session and issues a Turso group-scoped token. The browser never gets a long-lived admin key. Turso's "database per tenant" model is explicitly designed for this.

**Why we're probably not doing this anymore:** the per-user DB model solves a problem we don't have (strong tenant isolation, per-tenant backups, per-tenant schema) at the cost of real operational complexity (provisioning, quota, per-DB migrations, cross-DB leaderboard). Option 2 above gets us 95% of the speed win with a fraction of the ops surface, *and* makes leaderboard a single SQL query instead of a fan-out.

### 3. The scoring engine moves to the client

`server/src/lib/points.js` is already pure JS with zero Knex calls inside the formulas. Package it as a shared module used by both server (leaderboard materialisation) and client (live scoring). All Dashboard, CountryDetail and AddCountries scoring runs locally against the two DBs — zero round trips for score updates.

## What the client code looks like

Today:

```js
// AddCountries.jsx
await addUserCountry(user.id, code);   // POST → API → libsql
navigate('/dashboard');                 // triggers 2 more GETs
```

Proposed:

```js
// AddCountries.jsx
await userDb.execute(
  'INSERT INTO user_countries (id, user_id, country_code) VALUES (?, ?, ?)',
  [uuid(), user.id, code],
);
userDb.sync();                          // fire and forget
navigate('/dashboard');                 // reads local DB, instant
```

The API client (`client/src/api/client.js`) shrinks to:

- `POST /api/sync-token` — get a short-lived Turso token for this user
- `GET /api/leaderboard` — leaderboard aggregation (see below)
- `POST /api/users` — first-time provisioning (creates the user's Turso DB)

Everything else goes away.

## Leaderboard

With the shared-table model (option 2A above) leaderboard is free:

```sql
SELECT user_id, SUM(points) AS total
FROM user_visits
-- optional: join users table for username
GROUP BY user_id
ORDER BY total DESC
LIMIT 50;
```

If we want live scoring rather than storing a pre-computed `points` column, the leaderboard endpoint can pull the raw `user_visits` + shared seed data and run the existing scoring engine over it. For small user counts that's fine. For scale, store a denormalised `total_points` column written at visit-time and index on it.

No cross-DB fan-out, no cron, no materialisation layer needed on day one.

*(If we go with the per-user DB model instead, the original three-option leaderboard plan from the earlier draft still applies: materialised snapshot, scheduled aggregation, or N+1 fan-out.)*

## The libSQL / Turso tech options (as of April 2026)

| Tool | What it gives us | Catches |
|------|------------------|---------|
| `@libsql/client` (HTTP, browser) | Direct SQL from the browser to Turso with a scoped token — perfect for the user-writes path | Every query is a network call; fine for writes + occasional re-pull, not for live scoring |
| sql.js / wa-sqlite | Pure-WASM SQLite, mature, runs the World DB | No sync needed for a static read-only asset |
| `@libsql/client-wasm` | WASM SQLite with bidirectional sync to Turso | Only needed if we pick the per-user-DB path; still "experimental" branding |
| `@libsql/client` (embedded replica, Node) | Same sync model server-side | Node-only, uses native bindings |
| Turso row-level security / scoped tokens | Per-user write isolation in a shared DB — unlocks the simple architecture | Need to validate maturity of RLS / JWT-claim support in libSQL today |

The key tech validation this design needs: **can Turso mint per-user JWTs with claims referenced from SQL policies today?** If yes, we're done — single DB, scoped tokens, HTTP writes, WASM for seed reads. If no, we fall back to the table-per-user variant (API creates tables + issues table-scoped tokens) or to the per-user-DB approach (2b).

## Migration path (shared-DB flavour)

1. **Validate Turso RLS / scoped-token support.** Spike: can we mint a JWT with `{user_id}`, attach it to a libSQL connection, and have `INSERT`/`DELETE` on a shared table be constrained to rows matching that claim? If yes, proceed with option 2A. If no, fall back to table-per-user or per-user DB.
2. **Carve `points.js` into a shared package** that both server and client can import. Verify server tests stay green.
3. **Ship the World DB as a static asset.** Build step reads the seeds and emits `dist/world.db`. Client loads it into WASM SQLite on first run, caches in OPFS.
4. **Wire the client to read countries/cities/provinces from the World DB.** `getCountries`, `getCountry`, `getCountryCities` become local reads. API endpoints stay as a fallback until we're confident.
5. **Introduce the write-token endpoint.** New `POST /api/sync-token` validates session, mints a Turso JWT scoped to that user, returns it. Refresh before expiry.
6. **Switch writes to token-scoped libSQL HTTP calls.** `addUserCountry` / `removeUserCountry` / `addUserCity` / `addUserProvince` write directly to the shared Turso DB from the browser. Local state updates immediately; the network call is fire-and-forget with a retry queue.
7. **Replace server-side score endpoints** with client-side calls to the shared `points.js` against the World DB + the in-memory user rows.
8. **Simplify the leaderboard endpoint** to a single SQL query against the shared table.
9. **Delete the Express CRUD routes** once nothing reads them.

Each step is independently shippable. The big validation gate is step 1 — everything else is low-risk refactoring.

## What gets easier

- **Offline support** falls out for free.
- **Zero-cost scaling for reads.** Leaderboard aside, the server stops being on the hot path.
- **Mobile feels native.** Sub-50ms interactions.
- **Test story improves.** `points.js` tests already run in pure JS; client-side reads can be exercised with a fixture SQLite file.

## What gets harder

- **Token management** — short-lived JWTs, refresh flow, revoke-on-logout. Well-understood territory.
- **RLS policy correctness** — a bug in the policy could expose writes between users. Needs tests that assert "token for user A cannot insert rows with user_id = B".
- **Conflict resolution.** If I add "Spain" on my phone and my laptop at the same time, what wins? Probably doesn't matter here (our writes are essentially idempotent with a unique constraint) but worth thinking about.
- **Client never sees "server is down"** — if the network write queue backs up, we need a visible retry / sync indicator so a user doesn't lose work quietly.
- **Browser storage quotas.** OPFS can be evicted under storage pressure. Since Turso has the canonical copy, eviction is a re-pull scenario, not data loss.

*(The per-user-DB variant adds: per-DB provisioning, the 500-DB free-tier cap, per-DB schema migrations, and cross-DB leaderboard fan-out. Ditching those is the big win of the shared-DB approach.)*

---

## Open questions

These are the ones I want Charlie's and Lewis's view on before we invest:

1. **Does Turso RLS give us what we need, today?** Need a 30-minute spike: mint a JWT with a `user_id` claim, try to insert a row with the matching `user_id` (should succeed), try to insert with a different `user_id` (should fail). If this works the whole design snaps into place. If not, we fall back to table-per-user or per-user DB.

2. **Auth model:** right now it's localStorage + Google OAuth. Do we have a real server session/JWT we can use to mint Turso tokens? Or is the username the only identity we have? Answer affects how trustworthy the `user_id` claim is.

3. **Is offline-first actually a goal?** With the shared-DB approach, offline means "queue writes, replay on reconnect", which is simpler than full bi-directional sync but still non-trivial. If we don't need offline we can just disable writes when offline and skip the queue.

4. **How often does seed data change?** If "rarely" the static World DB is perfect. If "nightly" we'd want a refresh mechanism (ETag check + re-download) or a Turso-hosted read copy.

5. **Browser support floor:** are we comfortable requiring WASM + OPFS (Safari 17+, anything modern)? Fine for the target audience, worth being explicit.

6. **Schema evolution:** the shared DB model has exactly one schema to migrate — same as today. Big simplification vs. per-user-DB.

7. **Dev loop:** today `docker compose up` gives a working app. We'd keep a local libSQL/SQLite for dev and bake the World DB from seeds at build time. Should be a small change.

8. **Sync / retry UX:** do we show a "Saving…" / "Synced" indicator? I lean yes — silent failures in a writes-to-server app are bad. A tiny status dot in the nav is probably enough.

9. **The "is it actually faster?" test:** before we commit, worth prototyping the hot path (Dashboard score render) end-to-end with WASM SQLite + local user rows. If WASM load cost eats the network savings, the premise wobbles.

10. **Security posture:** RLS policies are a new attack surface. We need an integration test that proves token-for-A can't write rows for B. Same for reads if we make reads policy-scoped.

---

## Gut call

With Charlie's shared-DB reframe, the operational tax drops a lot and this looks genuinely attractive. The whole plan reduces to:

- Static World DB for seed data (read-only, shipped as an asset)
- Shared Turso DB for user visits with RLS-scoped tokens
- Scoring runs client-side against both

The remaining risks are narrow and testable: does Turso RLS work the way we need (question 1), and is the client hot path actually faster (question 9). Both are 1-day spikes.

If either spike fails, the fallback ladder is clear:
1. RLS broken → table-per-user with table-scoped tokens (same shape, uglier SQL)
2. WASM too slow → keep reads server-side, only move writes to local-first
3. Both fail → ship just the static World DB. Still halves perceived latency, zero new infra.

Either way, the next action is the two spikes, not a PR.
