# DB Speed Plan

> Plan for turning TravelPoints into a local-first web app with a real SQLite database in the browser, kept in sync with the Turso server of record. Goal: every page instant, every write 0 ms, end-to-end validated in Docker on every push.

Hobby project. No real users yet, so we're happy to drop data on any schema change. Password+JWT auth is plenty. Move fast.

---

## Progress tracker

Top-level checkpoints. Each phase has its own checklist further down.

- [ ] **Phase A** — Docker parity + E2E harness (~1 day)
- [ ] **Phase 0** — Lightweight auth (bcrypt + JWT cookie, email-or-handle usernames) (~½ day)
- [ ] **Phase 1** — Server change feed + debug metrics (~½ day)
- [ ] **Phase 2** — Client SQLite via sqlite-wasm (or sync-wasm) (~1 day)
- [ ] **Phase 3** — Incremental sync worker (skip if sync-wasm handles it) (~½ day)
- [ ] **Phase 4** — Kill server reads; port `points.js` to client (~½ day)
- [ ] **Phase 5** — Optimistic writes (~½ day)
- [ ] **Phase 6** — Reactive query hook (optional) (~½ day)

**Total Phases A–5: ~4 days.**

---

## TL;DR

- SQLite in the browser via **OPFS**. All reads = local SQL, microsecond latency.
- Writes still go through the Express API (JWT-authed). A server-side `_changes` feed echoes them back so the client stays in sync.
- Scoring moves to the client by sharing `server/src/lib/points.js` with a copy-and-CI-diff rule (simplest option that actually works in Docker; see Phase 4).
- Schema updates: a single `APP_SCHEMA_VERSION` integer. Mismatch → client wipes its OPFS DB and hard-reloads. No migration logic, ever.
- Every tier runs the same binaries in dev, CI, and prod. The whole loop is validated end-to-end in Docker via Playwright.

---

## Architecture

```
Browser (SPA)
┌──────────────────────────────────────────────────────────┐
│  SQLite WASM (OPFS-backed, persistent across reloads)    │
│    ├── countries, cities, provinces       (ref data)     │
│    ├── users, user_countries, user_cities, user_provinces│
│    └── _meta (cursor, schema_version)                    │
│                                                          │
│  Reads   → local SQL  (microseconds)                     │
│  Scoring → client/src/lib/points.js  (pure fns)          │
│  Leaderboard → local SQL ORDER BY points DESC LIMIT 50   │
│                                                          │
│  ↕ sync worker                                           │
│     ↓ GET /api/snapshot       (cold start)               │
│     ↓ GET /api/changes?since=N  (polled, incremental)    │
│     ↑ POST /api/users/:id/...   (writes, JWT-authed)     │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
Server (Express + Turso/libSQL)
  - Auth: bcrypt + JWT cookie + signin-hint cookie
  - Owns writes and schema (Knex migrations)
  - _changes table — every write appends (change_id, table, pk, op, row_json)
  - /api/snapshot: full JSON dump + current change_id
  - /api/changes?since=N: rows + tombstones since N
  - /api/debug/metrics: request timings, sync stats (dev + behind flag in prod)
  - APP_SCHEMA_VERSION header on every response
```

---

## Pinned versions (verified April 2026)

Don't float these — every one has bitten someone in the last 12 months.

| Thing | Pin | Why |
|---|---|---|
| Node | **22 LTS** | Node 20 LTS ends 2026-04-30. Don't target it. |
| `ghcr.io/tursodatabase/libsql-server` | **`v0.24.32`** | Project is maintenance-only; active work moved to the Rust `tursodatabase/turso` rewrite. `:latest` could shift. |
| `@libsql/client` | latest stable | One client for local file, dockerised sqld, and Turso cloud — three URL schemes, one code path. Don't mix in `better-sqlite3`. |
| `@sqlite.org/sqlite-wasm` | **`^3.51.2-build8`** | Use the OO1 API. Worker1 / Promiser1 are deprecated as of 2026-04-15. |
| `@tursodatabase/sync-wasm` | **`^0.5.0`** (beta) | Bidirectional sync (pull + push) since v0.5. Still beta — plan must tolerate falling back. |
| `mcr.microsoft.com/playwright` | **`v1.58.2-noble`** | Bundles Chrome for Testing 145.x. OPFS enabled by default. Match the npm `playwright` version exactly. |

CI logs installed versions at the start of every E2E run so drift is visible in the report.

---

## Why this over Replicache / Zero / Electric / PGlite

Condensed version of the earlier peer review; kept here so nobody re-asks.

| Option | Verdict (April 2026) |
|---|---|
| **Replicache** | Maintenance mode. Open-sourced by Rocicorp; no active development. K/V-shaped with duplicate mutator pairs — high ongoing tax for our ~3 write routes. Skip. |
| **Rocicorp Zero 1.0** | Now GA (shipped late 2025 / early 2026). Real option, but Postgres-upstream with a server-side SQLite replica; the browser store isn't a user-owned OPFS file. If we ever want "managed reactive sync" we'd adopt Zero and give up our SQLite-in-OPFS goal. Not our path today. |
| **ElectricSQL / PGlite** | GA. Postgres-in-the-browser. Mature, but wrong shape — we're on libSQL, not Postgres. |
| **Turso `@tursodatabase/sync-wasm`** | Native Turso sync, bidirectional, still **beta**. Best theoretical fit. Try first with a time-box. |
| **`@sqlite.org/sqlite-wasm` + hand-rolled sync** | Production-stable WASM build. ~150 LoC of change-feed code. Safe fallback. |

---

## Bottlenecks this plan fixes

From the API/data-access audit (see git history for the full report):

1. Leaderboard is O(users × visited_countries) per request.
2. `getUserTravelData` refetches all 195 countries + provinces on every hot endpoint.
3. N+1 city lookups when building a user's visited-countries list.
4. No HTTP caching on reference endpoints.
5. Scores recomputed server-side every request despite being a pure function of public data.
6. No `updated_at` / version column anywhere — diff-since-version pull impossible today.

Local SQLite in the browser collapses #1–#5 to essentially free. Phase 1 adds #6.

---

## Phases

Each phase is independently shippable with its own E2E test.

### Phase A — Docker parity + E2E harness (~1 day)

De-risk everything before touching features. Every tier runs the same binaries in dev, CI, and prod; the whole loop is validated in Docker.

- [ ] Pin `ghcr.io/tursodatabase/libsql-server:v0.24.32` in `docker-compose.yml` (currently `:latest`).
- [ ] Create `compose.prod-build.yml` overlay that builds the client as a static bundle and serves it from an nginx container.
- [ ] Create `compose.test.yml` overlay that adds a `playwright:v1.58.2-noble` service against the prod-build stack.
- [ ] Set **COOP/COEP headers** on the Vite dev server and the prod nginx (required for OPFS Worker threads — cheap to forget, ghost failures later).
- [ ] Add `/api/dev/reset` endpoint (gated by `NODE_ENV !== 'production'`) — truncates user tables, reseeds, bumps the reset marker.
- [ ] Add `make e2e` target: `docker compose down -v && docker compose -f compose.yml -f compose.prod-build.yml -f compose.test.yml run --rm e2e`.
- [ ] Write the first E2E smoke test: boots stack → signs up → adds a country → asserts the visit is in both the server DB and (after Phase 2) the browser OPFS DB.
- [ ] CI job runs the same compose commands and uploads the Playwright HTML report.
- [ ] CI logs `node -v`, `docker image inspect` digests, and installed npm versions at the start of every E2E run.

**Exit criteria:** `make e2e` goes green locally. CI runs the same command against the same pinned images.

### Phase 0 — Lightweight auth (~½ day)

Drop the localStorage-identity farce. Not "real" auth — good enough to stop casual impersonation.

- [ ] Migration: drop and rebuild `users` with `identifier TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`. The `identifier` field accepts **either a handle or an email** (the app doesn't care; unique index is case-insensitive).
- [ ] `POST /api/auth/signup` — validates identifier is either a plausible email or a reasonable handle (`^[a-z0-9][a-z0-9._-]{2,31}$`), bcrypts the password, returns a signed JWT in an **httpOnly `auth` cookie**.
- [ ] `POST /api/auth/signin` — same response shape.
- [ ] Also set a non-httpOnly **`last_identifier` cookie** (30-day expiry) so the signin form can pre-fill. Never contains a credential.
- [ ] `POST /api/auth/signout` — clears both cookies.
- [ ] Middleware verifies the JWT on every write route; asserts `req.user.id === params.user_id` or 403.
- [ ] Client: replace the localStorage identity flow with `/signin` and `/signup` pages; pre-fill the identifier input from the `last_identifier` cookie.
- [ ] E2E: sign up → cookie present → impersonation blocked (403) → signout clears cookies → last_identifier persists after signout so the form stays pre-filled.

**Exit criteria:** you can't act as another user by editing browser storage.

### Phase 1 — Server change feed + debug metrics (~½ day)

- [ ] Migration: `_changes` table — `(change_id INTEGER PK AUTOINCREMENT, table_name TEXT, pk TEXT, op TEXT CHECK (op IN ('insert','update','delete')), row_json TEXT, created_at TEXT)`.
- [ ] Every write route ALSO appends a `_changes` row **in the same transaction**. Helper: `changes.record(trx, table, pk, op, row)`.
- [ ] `GET /api/changes?since=N` → `{ changes: [...], cursor: <max_change_id> }`. Capped at 1000 rows per call; client re-asks until caught up.
- [ ] `GET /api/snapshot` → `{ countries, cities, provinces, users_public, cursor }`. `users_public` is the minimal user row needed for leaderboard display.
- [ ] Seed migration writes synthetic `_changes` rows for existing reference data at `change_id = 1`.
- [ ] `GET /api/debug/metrics` (dev always; prod behind `?token=<env>`): request count per route, p50/p95 timings, `_changes` table size, current max `change_id`, count of active sync cursors seen in last 5 min.
- [ ] Middleware: per-request timing log (server-timing header + structured log line).
- [ ] E2E: after a write, `_changes` has the row and `/api/changes?since=0` returns it.

**Exit criteria:** every write produces exactly one `_changes` row atomically. Debug metrics endpoint reachable.

### Phase 2 — Client SQLite via sqlite-wasm (~1 day)

- [ ] **Time-box experiment (half-day max):** wire `@tursodatabase/sync-wasm@^0.5.0` against the dockerised sqld. It does bidirectional sync natively — if it works, we save writing Phases 3 and half of 5. If it's flaky inside the compose networking, abandon and go to sqlite-wasm.
- [ ] Otherwise: add `@sqlite.org/sqlite-wasm@^3.51.2-build8` via the OO1 API (not Worker1 / Promiser1 — deprecated).
- [ ] `client/src/db/local.js`: opens an OPFS-backed DB named `traveleria-v<APP_SCHEMA_VERSION>-<user.id>.db`.
- [ ] On first open: `fetch('/api/snapshot')` → create tables matching server schema → bulk-insert rows → store cursor.
- [ ] Tiny helper API: `db.all(sql, params)`, `db.get(sql, params)`, `db.exec(sql)`.
- [ ] Confirm Vite serves COOP/COEP headers (carry-over from Phase A).
- [ ] E2E: cold-boot an incognito session → countries render from local SQLite with no `/api/countries` network call.

**Exit criteria:** after one cold boot, the app runs all read paths without hitting the network for reference data.

### Phase 3 — Incremental sync worker (~½ day)

Skip entirely if sync-wasm handled it.

- [ ] Poller (plain `setInterval` is fine; Web Worker if the main thread gets stuck): `/api/changes?since=<cursor>` every 5 s, plus on `focus` and `visibilitychange`.
- [ ] Apply each change in one transaction: `INSERT OR REPLACE` for insert/update, `DELETE` for delete.
- [ ] Persist the cursor inside the OPFS DB (`_meta` table), not localStorage.
- [ ] On any response with `X-App-Schema-Version` ≠ client's → wipe OPFS DB, reload page.
- [ ] E2E: write from browser A → browser B (incognito context) sees the new row within one poll.

**Exit criteria:** two browsers converge within 5–10 s of any write.

### Phase 4 — Kill server reads, move scoring to the client (~½ day)

- [ ] Port `server/src/lib/points.js` to `client/src/lib/points.js` via `cp server/src/lib/points.js client/src/lib/points.js`.
- [ ] Add a CI step that `diff`s the two files and fails with a clear message if they diverge. (Simplest approach that survives Docker build contexts — symlinks don't; npm workspaces are overkill for one file; revisit only when a second shared module shows up.)
- [ ] Mirror the server's `__tests__/points.test.js` under `client/__tests__/points.test.js` (same assertions, same fixtures). Both suites run in CI.
- [ ] Delete from `client/src/api/client.js`: `getCountries`, `getCountry`, `getUserCountries`, `getUserScore`, `getLeaderboard`. Replace each call site with a local SQL query.
- [ ] Leaderboard is a client-side query: compute per-user totals from synced `user_countries` rows, `ORDER BY total DESC LIMIT 50`.
- [ ] E2E golden test: scoring parity — for a fixed fixture (10 visited countries, known home), server-side `calculateTotalTravelPoints` exactly equals the client port.

**Exit criteria:** grepping the client for the deleted `getX` functions returns nothing. `diff server/src/lib/points.js client/src/lib/points.js` is empty in CI.

### Phase 5 — Optimistic writes (~½ day)

- [ ] `POST /api/users/:id/countries` returns `{ change_id, row }` in the response body.
- [ ] Client wraps every mutation: write to local SQLite inside a savepoint → fire the network call → on success commit + fast-forward cursor past the returned `change_id` → on failure rollback savepoint and show a toast.
- [ ] E2E: stop the `server` container mid-session → add a country → the UI updates instantly (optimistic) → restart server → next poll reconciles cleanly.

**Exit criteria:** the "add country" interaction has zero visible latency on a healthy network.

### Phase 6 — Reactive query hook (optional, ~½ day)

- [ ] `useSqlQuery(sql, params)` — re-runs the query after every successful sync tick or local mutation, returns `{ rows, loading }`.
- [ ] Rewrite Dashboard and CountryDetail to use it.
- [ ] E2E: observe that a second-tab write causes the first tab's UI to update on the next poll without any page-level refetch.

**Exit criteria:** pages don't manage their own data-fetch state.

---

## Schema updates & the web-app-reload story

- Single `APP_SCHEMA_VERSION` integer in the repo. Bump it in the same PR as any Knex migration or `/api/changes` payload-shape change.
- Server sends `X-App-Schema-Version: <N>` on every response (middleware, one-liner).
- Client compares against `import.meta.env.VITE_APP_SCHEMA_VERSION` (baked at build time).
- Mismatch → delete the OPFS DB file, show a "Updating…" splash, hard-reload. No user-data migration; we just drop.

---

## Local parity & end-to-end validation

**Rule:** every tier runs the same binaries in dev, CI, and prod. No "works on my machine" gap.

| Tier | Production | Local / CI (docker compose) | Parity |
|---|---|---|---|
| Primary DB | Turso cloud (libSQL) | `libsql-server:v0.24.32` (sqld) | ✅ already in compose |
| App server | Node 22 + Express | identical Dockerfile | ✅ already in compose |
| Client | Vite build, statically hosted (nginx) | same, via `compose.prod-build.yml` | ➕ add in Phase A |
| Browser SQLite | sqlite-wasm / sync-wasm in user's browser | same, in headless Chromium under Playwright | ➕ add in Phase A |
| E2E runner | — | `playwright:v1.58.2-noble` container | ➕ add in Phase A |

### Compose layout

```
compose.yml            # dev stack (existing)
compose.prod-build.yml # overlay: static client via nginx
compose.test.yml       # overlay: adds the playwright runner
```

### The E2E suite (one test per concern)

1. **Cold boot** — fresh browser, empty OPFS → `/api/snapshot` → countries render from local SQLite.
2. **Auth** — signup → `auth` cookie set → `last_identifier` cookie set → signout clears `auth` but leaves `last_identifier` → signin round-trip.
3. **Impersonation blocked** — `POST /api/users/<other_id>/countries` → 403.
4. **Write + sync echo** — add a country → local DB reflects instantly → server `_changes` contains the row → second browser context picks it up.
5. **Schema-version reload** — server bumps `APP_SCHEMA_VERSION` → client detects mismatch → OPFS wiped → fresh snapshot.
6. **Scoring parity** — fixed fixture; server total === client total.
7. **Leaderboard parity** — same user set; server-computed === client-computed.
8. **Offline blip** — stop the server → add a country → optimistic UI stays → restart → reconciles.

---

## Debug / metrics

Deliberately small; iterate as we hit things.

- **Server**: `/api/debug/metrics` endpoint (Phase 1). Per-route request counts, p50/p95, `_changes` size, current max `change_id`.
- **Server-Timing** header on every response so the browser DevTools shows per-route timing natively.
- **Client**: `console.group` any sync tick that applies >0 changes; log the count and wall-clock duration.
- **Sync lag gauge** (dev-only): tiny footer widget showing `local_cursor` vs `server_max_change_id` so drift is visible at a glance.

We can refine once we see real numbers.

---

## Risk list

| Risk | Mitigation |
|---|---|
| `@tursodatabase/sync-wasm` is beta | Half-day time-box in Phase 2; abandon to hand-rolled sync if it wobbles. |
| OPFS / Worker threads need COOP/COEP headers | Bake into Vite and nginx config in Phase A; Playwright test fails fast if missing. |
| sync-wasm networking inside docker-compose | Browser and server resolve the libsql URL differently; expose sqld on host `localhost:8080` and bake that URL into the client. If painful → fall back to sqlite-wasm. |
| ~1 MB gz sqlite-wasm bundle | Fine for desktop. Lazy-load after first paint if it starts to hurt. |
| Sync drift / cursor corruption | Server authoritative; any inconsistency → wipe OPFS + re-snapshot. |
| Leaderboard exposes everyone's visits to every client | Acceptable today (no real users). If it matters, sync a precomputed `user_totals` row instead. |
| `libsql-server` project is maintenance-only | Pin to `v0.24.32`. If Turso (the Rust rewrite) becomes the deployment target later, revisit. |

---

## Open questions for Charlie

1. Poll interval: 5 s blanket, or smarter (on focus + after local writes)?
2. Identifier rules: minimum handle length 3 chars OK? Email validation strict or loose?

(Resolved: bidirectional sync-wasm, leaderboard iterates later, email-or-handle usernames with auto-fill cookie, `points.js` sharing via copy + CI diff.)

---

## Rough effort estimate

| Phase | Effort |
|---|---|
| A — Docker parity + E2E harness | ~1 day |
| 0 — bcrypt+JWT auth | ~½ day |
| 1 — server change feed + metrics | ~½ day |
| 2 — client sqlite-wasm + snapshot (incl. sync-wasm time-box) | ~1 day |
| 3 — incremental sync worker | ~½ day (skippable if sync-wasm works) |
| 4 — kill server reads, port scoring | ~½ day |
| 5 — optimistic writes | ~½ day |
| 6 — reactive query hook (optional) | ~½ day |

**Total for Phases A–5: ~4 days.**
