# DB Speed — Scratch Plan

> **Status:** scratch / WIP. Peer review of the "Replicache + Turso" hypothesis and a concrete phased plan for TravelPoints. Not a spec yet — for discussion with Charlie before any code gets written.

---

## TL;DR

The hypothesis has the right instincts (local-first reads, API-only writes, lazy pull) but picks the wrong tool for **our** shape of problem in **April 2026**:

1. **Replicache is in maintenance mode.** Rocicorp pushed it out to open source and redirected development to Zero. It still works, but you'd be adopting a frozen codebase and paying the full BYOB integration cost.
2. **Zero isn't GA.** Targeted beta late-2025 / early-2026 and is Postgres-oriented. We're on Turso/libSQL, so Zero isn't a drop-in.
3. **Turso-in-the-browser exists but is early-access / private beta.** Promising, but not something to bet the app on today.
4. **Most importantly — our perf problems aren't the ones Replicache solves.** The dominant costs are server-side recomputation (leaderboard O(N×M), per-request score recomputation, N+1 city queries) and re-fetching ~100 KB of reference data on every page load. Shipping Replicache wouldn't touch any of those.

**Recommendation:** skip the sync-engine framework. Do a staged, boring plan: ETag-cached reference data in IndexedDB, move score computation client-side, fix the leaderboard, and add a lightweight schema-version / app-reload protocol. Revisit Turso browser sync or Zero in ~6 months when they're GA.

---

## Peer review of the hypothesis

### What's right

- **"Write to local first, let UI feel instant"** — the core local-first insight is correct.
- **"API owns writes to the shared DB"** — yes. A sync engine must not bypass server-side validation/authz.
- **"Poll for updates with a version cursor"** — correct pattern; every sync system boils down to this.
- **"Offline queueing"** — Replicache genuinely does this well.

### What's wrong or misleading

| Claim from hypothesis | Reality |
|---|---|
| "Replicache is the absolute best tool for this job right now" | Replicache is in **maintenance mode** in 2026. Rocicorp is directing new users to **Zero**, which is still alpha/beta. Neither is a safe production bet for a family side-project today. |
| "Zero UI latency — user never waits for Turso" | Our Turso calls aren't the bottleneck. The slow page loads come from server-side recomputation and payload re-fetching, not the Turso round-trip. |
| "Security: API handles all routing… session token" | **There is no auth in TravelPoints right now.** The client stores `{id, username, home_country}` in `localStorage` and any client can impersonate any user. Replicache doesn't fix this — it would layer on top of the same broken model. Real auth is a prerequisite for *any* sync strategy. |
| "Offline support" | Genuine, but not something Charlie has asked for. We're optimising for a mobile browser on patchy hotel Wi-Fi, not airplane mode. IndexedDB + optimistic updates covers 95 % of that without a sync framework. |
| "Increment a version integer on every user record write" | Fine in isolation but implies a schema migration, a new push/pull protocol, and re-plumbing every existing write route. Large integration cost for a 3-route write surface. |
| Implicit: "Replicache is Turso-aware" | Replicache is backend-agnostic. Every mutation has to be re-implemented twice — once as a local JS mutator, once as an SQL write on the server — and kept in sync forever. That's a permanent ongoing tax on a codebase where Charlie is learning as we go. |

### Why it doesn't fit TravelPoints specifically

Our shape of data (from mapping the API and fetch patterns):

- **~100 KB of mostly-read reference data** (195 countries, ~2–3k cities, ~900 provinces) — served on nearly every page.
- **Three write endpoints**, all per-user visit tracking. Low write rate. No collaboration. No realtime.
- **Pure-function scoring engine** (`server/src/lib/points.js`) — takes reference data + user visits, returns a number. Completely portable to the client.
- **Single logged-in user per browser**, no cross-device merging problem.

Replicache is built for Figma/Linear-style apps: many concurrent collaborators mutating shared state, offline-first, with complex server-authoritative merge semantics. We have ~none of that.

---

## What our actual bottlenecks are

From the API/data-access audit:

1. **Leaderboard is O(users × visited_countries) per request.** It loads every user, recomputes every user's score from scratch, no caching, no pagination. On even 10 users this is already 1–2 s. `server/src/routes/leaderboard.js:46-96`.
2. **`getUserTravelData` refetches all 195 countries and all provinces on every hot endpoint** (`/score`, `/countries`). Reference data is re-queried request-after-request. `server/src/routes/users.js` (see audit).
3. **N+1 city lookups** when building a user's visited countries list.
4. **Every page fetches the same reference data again** — no HTTP caching headers, no ETag, no IndexedDB.
5. **Score recomputed server-side on every request** despite being a pure function of public reference data plus the visit set the client already has.
6. **No `updated_at` / version column anywhere** — so a diff-since-version pull is impossible today even if we wanted it.

Fix those and the app will feel fast without any sync engine.

---

## Proposed architecture

A small, boring, Turso-friendly version of the hypothesis. Same instincts, a fraction of the code.

```
              ┌──────────────────────────────────────┐
              │            Browser (SPA)             │
              │                                      │
              │  IndexedDB (reference data cache)    │
              │    ├── countries                     │
              │    ├── cities                        │
              │    └── provinces                     │
              │                                      │
              │  In-memory + localStorage (user)     │
              │    ├── user profile                  │
              │    ├── visited_countries             │
              │    ├── visited_cities                │
              │    └── visited_provinces             │
              │                                      │
              │  client/src/lib/points.js            │
              │    (ported from server/src/lib)      │
              └───────────┬──────────────────────────┘
                          │
           GET /api/ref?since=<version>  (polled / conditional)
           POST /api/users/:id/countries (writes only)
           GET  /api/version             (schema/app version check)
                          │
              ┌───────────┴──────────────────────────┐
              │       Express API (unchanged shape)  │
              │  - Owns writes, owns auth            │
              │  - Serves reference data with ETag   │
              │  - Owns schema via Knex migrations   │
              │  - Publishes SCHEMA_VERSION constant │
              └───────────┬──────────────────────────┘
                          │
                       Turso (single source of truth)
```

The API server stays the authoritative write path and the authoritative schema owner. No Replicache push/pull protocol. No local-first mutators to keep in sync.

---

## Phased plan

Each phase is independently shippable. Ship, measure, then decide on the next.

### Phase 0 — Measure (before touching anything)

- Add server timing logs to the top 5 endpoints, flag p95s.
- Record baseline numbers: Dashboard mount, CountryDetail mount, Leaderboard, AddCountry round-trip. This is what we'll compare against.
- Output: a short `docs/db-speed-baseline.md` with numbers.

### Phase 1 — Quick wins on the server (biggest ROI, no client changes)

1. **Fix the leaderboard.** Either:
   - Materialised: a `user_totals` table, updated on every visit write (small trigger in route code), and `/leaderboard` becomes a plain `SELECT … ORDER BY total_points DESC LIMIT 50`. Or
   - Cached: in-memory LRU with a 60 s TTL, invalidated on write.
   Preference: materialised. It's also what the in-page score card can read.
2. **Cache reference-data fetches inside the Node process.** `getAllCountries()` / `getAllProvinces()` only change on deploy; load once, keep in module scope, invalidate on `NODE_ENV === 'test'`.
3. **Add ETags** to `/api/countries`, `/api/countries/:code/cities`, `/api/countries/:code` (reference part only). A hash of the seed version is enough.
4. **Eliminate the N+1** in `getUserTravelData` by batch-loading cities with one `WHERE country_code IN (…)` query.

Expected result: Dashboard and Leaderboard drop an order of magnitude in latency, with zero client-side change.

### Phase 2 — Client cache for reference data

1. Wrap `client/src/api/client.js` so `getCountries`, `getCountryCities`, `getProvinces` go through an IndexedDB-backed cache (idb-keyval or Dexie — Dexie is friendlier, ~15 KB gz).
2. On app boot: read cached reference data, show UI immediately, fire a conditional `If-None-Match` request in the background.
3. 304 → keep cache. 200 → replace and bump stored ETag.
4. Tie the cache key to the schema version (Phase 4) so a migration forces a refill.

Expected result: cold page load still hits the network once, warm loads are instant and offline-tolerant for read paths.

### Phase 3 — Move score computation to the client

1. Port `server/src/lib/points.js` to `client/src/lib/points.js` (pure functions, no Node deps). Keep the server copy authoritative for tests and leaderboard.
2. Share the constants via a single JSON config that both sides import, or (cleaner) extract `points.js` to a shared package under `packages/points` and have both server and client import it.
3. Dashboard / CountryDetail compute scores locally from cached reference data + local visit set. No `/score` round-trip on navigation.
4. Server still computes the authoritative score for leaderboard writes.

Expected result: navigation between pages is instant; only add/remove visit actions touch the network.

### Phase 4 — Schema version + app reload protocol

This is where we sense-check the hypothesis's "API still manages schema updates" concern.

1. A single `APP_SCHEMA_VERSION` integer committed in the repo, bumped whenever the shape of the API or reference data changes. Exposed at `GET /api/version` and returned as an `X-App-Schema-Version` response header on every API call.
2. The client stores the version it was built against (`import.meta.env.VITE_APP_SCHEMA_VERSION`) and compares on every response.
3. Mismatch handling:
   - **Server version > client version** → show a non-blocking "New version available — reload" banner. On any write attempt, force the reload.
   - **Server version < client version** (shouldn't happen outside local dev) → warn in console, don't block.
4. On version bump, the IndexedDB cache namespace is rebuilt (cache key includes the version), so stale reference data can never be served against a new schema.
5. Knex migrations continue to be the source of truth for DB shape; the `APP_SCHEMA_VERSION` bump lives in the same PR as the migration, so they move together.

This gives us the "web app reloads when required" behaviour without needing Replicache's push/pull semantics.

### Phase 5 — Real auth (prerequisite for anything beyond this)

Before *any* sync-engine experiment or true local-first write path, we need actual authentication. Today the user ID is client-asserted in `localStorage`; a sync layer on top of that amplifies the security hole. Wire up the Google OAuth that the `google_id` column was prepared for, put a signed session cookie on requests, and enforce `session.user_id === params.user_id` server-side on every write route.

### Phase 6 (deferred) — Revisit sync frameworks

Reassess once any of these land:
- **Turso embedded replicas in the browser go GA** (not private beta). Then we can pull read-only replicas of `countries` / `cities` / `provinces` directly, no custom ETag plumbing, and Turso's WAL streaming gives us free incremental updates.
- **Zero hits 1.0 and gets libSQL/SQLite backend support.** Then we'd have a supported, modern path to full local-first writes.
- **The write rate changes.** If TravelPoints grows into something where users are logging visits rapidly or offline matters, the calculus for Replicache/Zero changes.

Until one of those happens, the Phase 1–4 plan is cheaper to build, cheaper to debug, and gets 90 % of the perceived-performance win.

---

## Open questions to discuss with Charlie

1. Is **leaderboard freshness** OK at a 60-second lag, or does it need to be instant? (Affects cache vs. materialised table.)
2. Do we want **offline "add a visited country"**? If yes, Phase 3.5 adds an outgoing mutation queue (~half a day of work). If no, skip it.
3. Is **real auth (Phase 5) a blocker for merging the rest**, or can it ship independently? My vote: parallel track, because the current localStorage model is already shipped and the performance work is additive.
4. Are we comfortable extracting `points.js` into a **shared package** (monorepo-ish), or would Charlie rather we copy-paste it across server and client for now? Shared is cleaner; copy is simpler.

---

## Rough effort estimate

| Phase | Effort | Risk |
|---|---|---|
| 0 — measure | ~half a day | none |
| 1 — server quick wins | 1–2 days | low |
| 2 — IndexedDB ref cache | 1–2 days | low |
| 3 — client-side scoring | 1 day (if `points.js` stays pure) | low |
| 4 — schema version + reload | half a day | low |
| 5 — real auth | 2–3 days | medium (UX decisions) |
| 6 — revisit sync engines | — | deferred |

Total for Phases 0–4 ≈ **one week**. That's the fast path to "the app feels snappy" without committing to a sync framework that's either frozen or not GA yet.
