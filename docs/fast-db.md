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

### 2. The **User DB** — per-user, read/write, bidirectional sync

One Turso database per signed-in user, containing that user's `user_countries`, `user_cities`, `user_provinces`, and a cached copy of their `users` row.

The browser opens it as a **libSQL embedded replica** via `@libsql/client-wasm`:

- Reads hit the local WASM SQLite — synchronous, microseconds.
- Writes go to the local DB **and** queue for push to Turso. App code never awaits the network.
- `db.sync()` is called on app load, on focus, and after each write (lazy, fire-and-forget).

**Auth & isolation:** each user's DB URL + short-lived auth token comes from a tiny auth endpoint (`POST /api/sync-token`) that validates the session and issues a Turso group-scoped token. The browser never gets a long-lived admin key. Turso's "database per tenant" model is explicitly designed for this.

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

## Leaderboard: the one thing that doesn't fit

The leaderboard needs a view across **all users' data**. You can't express "top 50 by points" from a single client's local DB.

Three ways out:

1. **Server-side materialised leaderboard.** Each write publishes a pre-computed `total_points` summary to a shared "leaderboard" DB (or table in a shared Turso). Server recomputes on push, or client publishes its own score. Fast reads, minimal storage.
2. **Scheduled snapshot.** A cron (Render cron job or similar) iterates all user DBs nightly and writes a `leaderboard` table into the shared World DB. Stale for 24h, but dead simple.
3. **Keep the current server-side leaderboard endpoint.** It iterates per-user Turso DBs instead of joining a single DB. Slower. N+1. Only OK while user count stays small.

Option 1 is the right answer long term but needs a webhook or client-initiated publish step. Option 3 is fine for launch.

## The libSQL / Turso tech options (as of April 2026)

| Tool | What it gives us | Catches |
|------|------------------|---------|
| `@libsql/client-wasm` | SQLite-in-browser with OPFS persistence and bidirectional sync to Turso | Still "experimental" branding; OPFS is Safari 17+, Chrome 108+, Firefox 111+ |
| `@libsql/client` (HTTP) | Zero-install SQL over HTTPS | Every query is a network call — defeats the point |
| `@libsql/client` (embedded replica, Node) | Same sync model server-side | Node-only, uses native bindings |
| sql.js / wa-sqlite | Pure-WASM SQLite, mature | No sync protocol — we'd have to build our own |
| Turso per-user DB | Cheap tenancy, free tier covers 500 DBs | Hard cap on free tier; needs provisioning flow |

`@libsql/client-wasm` is the key piece. If it doesn't meet our bar for reliability we fall back to sql.js for reads + a custom write queue that flushes to a server endpoint that talks to Turso over HTTP.

## Migration path (if we do this)

1. **Carve `points.js` into a shared package** that both server and client can import. Verify server tests stay green.
2. **Ship the World DB as a static asset.** Build step reads the seeds and emits `dist/world.db`. Client loads it into WASM SQLite on first run, caches in OPFS.
3. **Wire the client to read countries/cities/provinces from the World DB.** `getCountries`, `getCountry`, `getCountryCities` become local reads. API endpoints stay as a fallback until we're confident.
4. **Introduce per-user Turso provisioning.** New `POST /api/users` creates a user + a Turso DB for them + returns its URL. `POST /api/sync-token` returns a scoped token.
5. **Switch writes to local-first.** `addUserCountry` / `removeUserCountry` / `addUserCity` / etc. write to the user DB, sync in background.
6. **Replace server-side score endpoints** with client-side calls to the shared `points.js` against the two local DBs.
7. **Keep the leaderboard endpoint** initially (option 3 above). Revisit once user count forces the issue.
8. **Delete the Express CRUD routes** once nothing reads them.

Each step is independently shippable. We don't need a big-bang rewrite.

## What gets easier

- **Offline support** falls out for free.
- **Zero-cost scaling for reads.** Leaderboard aside, the server stops being on the hot path.
- **Mobile feels native.** Sub-50ms interactions.
- **Test story improves.** `points.js` tests already run in pure JS; client-side reads can be exercised with a fixture SQLite file.

## What gets harder

- **Deployment topology** — we now have to provision Turso DBs per user. Needs error handling (quota, transient failures).
- **Token management** — short-lived tokens, refresh flow, revoke-on-logout.
- **Schema migrations across millions of little DBs** — each user DB needs to be migrated when schema changes. libSQL has per-DB migration primitives but it's still a new muscle to build.
- **Conflict resolution.** If I add "Spain" on my phone and my laptop at the same time, what wins? Probably doesn't matter here (our writes are essentially idempotent with a unique constraint) but worth thinking about.
- **Browser storage quotas.** OPFS can be evicted under storage pressure. If the user DB is only in OPFS and Turso has the canonical copy, eviction is a sync-and-recover scenario, not data loss.

---

## Open questions

These are the ones I want Charlie's and Lewis's view on before we invest:

1. **Is offline-first actually a goal?** It's a free side-effect of this design, but if we don't care about it we could consider simpler models (e.g. keep writes server-side, only move reads to a local WASM SQLite).

2. **What's the user ceiling we're designing for?** 100 users? 10,000? The per-user Turso DB model costs $0 up to 500 DBs on free tier. If we expect to blow past that quickly, we might prefer a single shared DB with row-level scoping and ditch the per-user idea.

3. **Auth model:** right now it's localStorage + Google OAuth. Do we have a real server session/JWT we can use to mint Turso tokens? Or is the username the only thing we have?

4. **How often does seed data change?** If the answer is "when Lewis edits a seed file every few months", static World DB is perfect. If it's "nightly imports from some source", we need the Turso read-replica path.

5. **Leaderboard freshness:** is 24h stale OK for the leaderboard (scheduled snapshot), or do we need within-minute updates (requires write-time publish)?

6. **Browser support floor:** are we comfortable requiring OPFS-capable browsers (i.e. dropping Safari < 17 and anything older)? Today this is basically "anything from 2023+" which is probably fine for this app's audience.

7. **Schema migration strategy for per-user DBs:** do we version the User DB schema and run migrations on open? Do we do it lazily on first access? This is the least solved piece in my head.

8. **Dev loop:** today `docker compose up` gives a working app. Do we still want that to Just Work with a local libSQL and local "World DB" baked from seeds? I think yes — shouldn't be hard.

9. **Sync observability:** do we surface sync state to the user ("Synced", "Saving…") or keep it fully invisible? The risk of invisible is the rare case where sync is failing and the user doesn't know their data isn't on the server.

10. **The "is it actually faster?" test:** before we commit, worth prototyping the hot path (Dashboard score render) end-to-end with a WASM SQLite + local data and comparing. If the WASM load cost eats the network savings, the whole premise wobbles.

---

## Gut call

Worth doing **if** questions 2, 6, and 10 land favourably. The big win isn't the server bill — it's that every interaction in the app stops feeling like a web form submission and starts feeling like a native app. That fits the vibe (the app is fundamentally about delight, not data entry). The big risk is operational complexity: per-user DBs, sync tokens, schema fan-out. We should budget for that honestly, not hand-wave it.

If we don't want the operational tax, a lighter version is still a big win: ship World DB as a static file, keep writes server-side. That alone probably halves perceived latency on every page without any of the sync headaches.
