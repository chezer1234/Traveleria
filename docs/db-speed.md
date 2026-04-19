# DB Speed — Scratch Plan

> **Status:** scratch / WIP, v2 (bold edition). v1 played it safe; v2 takes off the production-grade handbrake. No real users, hobby project, happy to drop and reseed data, lightweight password+JWT is plenty of auth, move fast and break things. **Primary goal: see how fast we can make this with a real in-browser database.**

---

## TL;DR

- The Replicache/Zero peer review still stands (below). Neither is the right framework in April 2026.
- **But the bold play is to go fully local-first:** a real SQLite database in the browser, populated and kept in sync from the server. All reads become microsecond-latency local SQL. Writes still go through the API; the sync loop echoes them back.
- Two candidates for the browser DB:
  1. **`@tursodatabase/sync-wasm`** — native Turso sync in the browser. Early-access / private beta, but *the* theoretical best fit since the server is already Turso. **Try this first** with a 1-day time-box.
  2. **`@sqlite.org/sqlite-wasm` + OPFS + hand-rolled sync** — production-stable WASM build; we write ~150 LoC of change-feed code ourselves. Safe fallback if sync-wasm is rough.
- Scoring moves to the client (port `points.js` — it's already pure). Leaderboard becomes a local SQL query.
- Auth: username + bcrypt password + JWT in an httpOnly cookie. Not real auth, just enough to kill the localStorage impersonation farce.
- Schema updates: single `APP_SCHEMA_VERSION` constant. Server sends it as a header; on mismatch the client wipes its OPFS DB and re-snapshots. No user-data migration ever — we just drop.
- **Every tier runs the same binaries locally as in prod** — sqld (already in `docker-compose.yml`), the server container, a prod-build client container, and headless Chromium via Playwright. The whole stack is validated end-to-end in Docker on every push, so nothing ships unless the full loop is green.

Rough total for Phases A–5: **~4 days of focused work.**

---

## Peer review of the original hypothesis

### What's right

- **"Write to local first, let UI feel instant"** — correct instinct.
- **"API owns writes to the shared DB"** — correct; any sync layer must not bypass authz.
- **"Poll for updates with a version cursor"** — correct pattern; every sync system reduces to this.
- **"Offline queueing"** — genuinely a Replicache strength.

### What's wrong or misleading in April 2026

| Claim from hypothesis | Reality |
|---|---|
| "Replicache is the absolute best tool for this job right now" | Replicache is in **maintenance mode**. Rocicorp open-sourced it and redirected development to Zero. You'd be adopting a frozen codebase. |
| "Zero (implied successor) is ready" | **Zero isn't GA.** Beta targeted for late-2025 / early-2026. It's Postgres-shaped and doesn't have a libSQL/Turso backend. |
| "Zero UI latency — user never waits for Turso" | The Turso round-trip isn't our bottleneck today. The slow bits are **server-side recomputation** (leaderboard O(users × countries)), N+1 city queries, and re-fetching ~100 KB of reference data on every page load. A sync framework wouldn't fix any of those. |
| "Security: API handles session token" | **TravelPoints has no auth today.** The client stores `{id, username, home_country}` in `localStorage` and any client can impersonate any user. Replicache doesn't fix this — it'd layer on top of a broken identity model. |
| Implicit: "Replicache is Turso-aware" | Replicache is backend-agnostic and **K/V-shaped**. Every mutation has to be reimplemented twice (local JS mutator + server SQL writer) and kept in sync forever. Heavy ongoing tax on a 3-route write surface. |

### Why it still doesn't fit TravelPoints specifically

Our actual shape (from the audit):

- **~100 KB of mostly-read reference data** (195 countries, ~2–3k cities, ~900 provinces).
- **Three write endpoints**, all per-user visit tracking. Low write rate. No collaboration. No realtime.
- **Pure-function scoring engine** — portable to the client as-is.
- **One logged-in user per browser**, no cross-device merging problem.

Replicache was built for Figma/Linear-style apps (many collaborators, offline-first, complex merge semantics). We have ~none of that. The *local SQLite* idea is the right half of the hypothesis; the *Replicache framework* part is the wrong half.

---

## What our actual bottlenecks are

From the API/data-access audit:

1. **Leaderboard is O(users × visited_countries) per request.** `server/src/routes/leaderboard.js:46-96`.
2. **`getUserTravelData` refetches all 195 countries + provinces on every hot endpoint** (`/score`, `/countries`).
3. **N+1 city lookups** when building a user's visited-countries list.
4. **No HTTP caching** on reference endpoints — no ETag, no Last-Modified.
5. **Scores recomputed server-side every request** despite being a pure function of public data + the visit set the client already has.
6. **No `updated_at` / version column anywhere** — can't do a diff-since-version pull today.

Local SQLite in the browser collapses #1–#5 to essentially free. #6 we add in Phase 1.

---

## Architecture (v2)

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
Server (Express + Turso)
  - Auth: bcrypt + JWT cookie
  - Owns writes and schema (Knex migrations)
  - _changes table — every write appends (change_id, table, pk, op, row_json)
  - /api/snapshot: full JSON dump + current change_id
  - /api/changes?since=N: rows + tombstones since N
  - APP_SCHEMA_VERSION header on every response
```

---

## Why SQLite-in-browser (vs. Replicache, vs. just caching)

| Option | Verdict |
|---|---|
| Replicache | Maintenance mode; K/V; duplicate mutators. Skip. |
| Zero | Not GA; Postgres-shaped; no libSQL. Reassess in 6–12 months. |
| `@tursodatabase/sync-wasm` | Theoretical best fit — native Turso sync. Early-access private beta. **Try first, 1-day time-box.** |
| `@sqlite.org/sqlite-wasm` + hand-rolled sync | Production-stable WASM. ~150 LoC of change-feed code. **Safe fallback.** |
| IndexedDB + JSON cache (v1 plan) | Works but leaves scoring server-side and doesn't get the "real SQL on the client" win. Now redundant. |

---

## Phases

Each phase is independently shippable. Ship, poke it, move on.

### Phase A — Docker parity + E2E harness (~1 day, goes FIRST)

De-risk everything before touching features. Every tier must run the same software locally that it runs in production, and the full stack must be testable end-to-end inside Docker.

- Good news: `docker-compose.yml` already runs `ghcr.io/tursodatabase/libsql-server` (sqld) — same binary, same libsql wire protocol as Turso cloud. DB-tier parity is already in place; CLAUDE.md's "local file for dev, cloud for prod" note is out of date.
- Add `compose.test.yml` — extends the base compose with a Playwright service that runs headless Chromium against the dev stack.
- Add a `make e2e` target and an `/api/dev/reset` endpoint (dev-only, gated by `NODE_ENV !== 'production'`) that truncates user tables, reseeds, and bumps a test marker.
- Write one end-to-end smoke test that boots the stack, signs a user up, adds a country, and asserts the visit is in both the server DB and the client OPFS DB. This is the scaffolding every later phase hangs its own tests off.
- Add a CI job that runs the same compose commands — GitHub Actions uses the exact same binaries as local.

### Phase 0 — Lightweight auth (~half day)

- Drop `users` and rebuild with `password_hash` column (no users to migrate).
- `POST /api/auth/signup` and `POST /api/auth/signin` — bcrypt + sign a JWT, set as httpOnly cookie.
- Middleware verifies the cookie and attaches `req.user.id`.
- All write routes assert `req.user.id === params.user_id`.
- Client replaces the localStorage-identity flow with signup/signin pages.

### Phase 1 — Server change feed (~half day)

- New `_changes` table: `(change_id INTEGER PK AUTOINCREMENT, table TEXT, pk TEXT, op TEXT, row_json TEXT, created_at)`.
- Every write route ALSO appends a `_changes` row in the same transaction.
- `GET /api/changes?since=N` → `{ changes: [...], cursor: <max_change_id> }`.
- `GET /api/snapshot` → `{ countries: [...], cities: [...], provinces: [...], cursor: <max_change_id> }`.
- Seed migration inserts synthetic `_changes` rows for existing reference data at change_id 1.

### Phase 2 — Client SQLite via sqlite-wasm (~1 day)

- Add `@sqlite.org/sqlite-wasm`.
- `client/src/db/local.js`: opens an OPFS-backed DB named `traveleria-v<APP_SCHEMA_VERSION>-<user.id>.db`.
- On first open: fetch `/api/snapshot`, create tables matching server schema, bulk-insert rows, store cursor.
- Tiny helper: `db.all(sql, params)`, `db.get(sql, params)`, `db.exec(sql)`.
- **Time-box experiment: try `@tursodatabase/sync-wasm` first.** If the snapshot-then-sync dance "just works", use it and skip Phase 3. Otherwise fall back to sqlite-wasm here.

### Phase 3 — Incremental sync worker (~half day)

(Skip if `sync-wasm` handled it.)

- Web Worker (or plain `setInterval` for simplicity) polls `/api/changes?since=<cursor>` every 5 s, plus on `focus` and `visibilitychange`.
- Apply each change in a transaction: INSERT OR REPLACE for ops `insert`/`update`, DELETE for `delete`.
- Update cursor after each successful apply.
- On `APP_SCHEMA_VERSION` mismatch in any response → wipe OPFS DB, reload.

### Phase 4 — Kill server reads, move scoring to the client (~half day)

- Delete (or stub) `getCountries`, `getCountry`, `getUserCountries`, `getUserScore`, `getLeaderboard` from `client/src/api/client.js`. Replace each call site with a local SQL query.
- Port `server/src/lib/points.js` to `client/src/lib/points.js` (literal copy of a pure-function module). Server keeps its copy for tests and any server-side use; when it's worth it we extract to `packages/points` and both import it.
- Leaderboard is now:
  ```sql
  SELECT user_id, SUM(points) AS total
  FROM user_country_scores_view  -- or compute in JS per user
  GROUP BY user_id ORDER BY total DESC LIMIT 50
  ```
  — every client has everyone's visit data. For a hobby project this is fine and makes the leaderboard instant.

### Phase 5 — Optimistic writes (~half day)

- `POST /api/users/:id/countries` returns `{ change_id, row }`.
- Client applies the mutation to local SQLite **before** the network call, inside a "pending" savepoint.
- On success: commit and fast-forward cursor past the returned `change_id`.
- On failure: rollback savepoint, show an error toast.
- Net effect: add/remove country feels 0 ms; the sync worker reconciles anything remote in the next poll.

### Phase 6 (nice-to-have) — Reactive queries

- `useSqlQuery(sql, params)` React hook that re-runs after every successful sync tick or local mutation.
- Pages become pure: "give me a query, I'll re-render when data changes."
- Nothing essential — but it makes the code delightful.

---

## Schema updates & the web-app-reload story

- `APP_SCHEMA_VERSION` is a single integer constant in the repo, bumped in the **same PR as any Knex migration** or any change to the `/api/changes` payload shape.
- Server sends `X-App-Schema-Version: <N>` on every response (middleware, one-liner).
- Client compares against `import.meta.env.VITE_APP_SCHEMA_VERSION` (baked at build time).
- Mismatch → delete the OPFS DB file, show a "Updating…" splash, hard-reload. Because we're happy to drop data, there's no migration logic to write. Ever.
- Knex migrations remain the authoritative schema source for the server.

---

## Local parity & end-to-end validation

**Rule:** every tier runs the same binaries in dev, CI, and prod. No "works on my machine" gap, and the whole loop is exercised end-to-end in Docker on every push.

### Tier parity

| Tier | Production | Local / CI (docker compose) | Parity status |
|---|---|---|---|
| Primary DB | Turso cloud (libSQL) | `ghcr.io/tursodatabase/libsql-server` (sqld) | ✅ already in compose |
| App server | Node + Express container | identical Dockerfile | ✅ already in compose |
| Client | Vite build, statically hosted | Vite dev container (+ a prod-build smoke in CI) | ⚠️ add prod-build variant |
| Browser SQLite | sqlite-wasm (or sync-wasm) in user's browser | same, running in headless Chromium under Playwright | ➕ add |
| E2E runner | — | `mcr.microsoft.com/playwright` container | ➕ add |

### Compose layout

```
compose.yml            # dev stack: sqld + server + client (existing)
compose.prod-build.yml # overlay: builds & serves the static client
compose.test.yml       # overlay: adds the playwright runner + uses compose.prod-build.yml
```

Run modes:

```bash
docker compose up                                        # dev, as today
docker compose -f compose.yml -f compose.prod-build.yml up
docker compose -f compose.yml -f compose.prod-build.yml \
               -f compose.test.yml run --rm e2e          # full E2E
```

### What the E2E suite covers

A Playwright suite, minimum one test per concern:

1. **Cold boot** — fresh browser, empty OPFS → `/api/snapshot` fetched → countries render from local SQLite.
2. **Auth** — signup → JWT cookie present → signin round-trip → logout clears cookie.
3. **Write + sync echo** — add a country → local DB reflects instantly (optimistic) → server `_changes` contains the row → second browser session (incognito context) picks it up on next poll.
4. **Impersonation blocked** — `POST /api/users/<other_id>/countries` → 403.
5. **Schema-version reload** — server bumps `APP_SCHEMA_VERSION` → client detects mismatch on next response → OPFS wiped → fresh snapshot → no stale rows.
6. **Scoring parity** — for a fixed fixture (10 visited countries, known home), server-computed `calculateTotalTravelPoints` === client port. Golden-file test.
7. **Leaderboard parity** — server-computed leaderboard === client-computed leaderboard for the same user set.
8. **Offline blip** — stop the `server` container mid-session → add a country → client shows optimistic state → restart server → next poll reconciles cleanly.

### Fixtures & reset

- `/api/dev/reset` (dev-only middleware gate): truncate user tables, rerun seeds, bump schema reset marker. Called from Playwright `beforeAll`.
- Deterministic seed user set checked into `server/src/db/seeds/dev_users.js`.
- `make e2e` = `docker compose down -v && docker compose -f compose.yml -f compose.prod-build.yml -f compose.test.yml run --rm e2e`.

### CI (GitHub Actions)

- Existing `ci.yml` job (migrations + Jest + client build) keeps running as a fast lane.
- New `e2e` job runs the same `docker compose ... run e2e` command a human would, then uploads the Playwright HTML report as an artifact. This is the single source of truth for "does the stack actually work."

### Gotchas to validate during Phase A

- **sqlite-wasm in Node**: yes, it runs in Node — use it for unit tests of the ported `points.js` against a snapshot DB, no browser needed.
- **sync-wasm networking inside compose**: the browser (Playwright container) and the server are in the same docker network, but the URL baked into the client must resolve from *both* contexts. Easiest: expose sqld on `localhost:8080` via compose port mapping and set the client to use `http://localhost:8080`, then run Playwright in host-network mode in CI. If this is painful, that's a strong signal to take the hand-rolled sync path instead of sync-wasm.
- **OPFS in headless Chromium**: supported since Chromium 108. Playwright bundles a recent enough Chromium. Fine.
- **sqld volume state between test runs**: use a named volume but `docker compose down -v` before each E2E run for determinism.
- **JWT secret in CI**: just a fixed `dev-secret` env var in `compose.test.yml`. No real secrets needed for E2E.

### How this de-risks each phase

| Phase | What the E2E suite catches |
|---|---|
| 0 (auth) | #2 impersonation, #4 cookie behaviour |
| 1 (change feed) | #3 write+sync echo, #8 offline blip |
| 2 (client SQLite) | #1 cold boot |
| 3 (sync worker) | #3, #8 |
| 4 (client-side reads) | #6 scoring parity, #7 leaderboard parity |
| 5 (optimistic writes) | #3, #8 |

If any phase's E2E test goes red, that phase isn't done — regardless of what the unit tests say.

---

## Dev loop

- `docker compose up -d --build` unchanged for day-to-day.
- `make reset-db` unchanged (drops sqld volume + rebuilds). Add `make e2e` for the full test lane.
- `/api/dev/reset` is dev-only and doubles as the E2E reset hook.
- Unit tests:
  - Server `points.js` Jest tests untouched.
  - Client port gets a mirrored Jest suite using sqlite-wasm in Node.

---

## Risk list

| Risk | Mitigation |
|---|---|
| `@tursodatabase/sync-wasm` is beta, might be rough | 1-day time-box; fall back to hand-rolled sync on sqlite-wasm. |
| OPFS wobbles on iOS Safari | Chrome/Firefox/Edge are solid; Safari 17+ is good. Hobby project, not a blocker. |
| ~1 MB gz bundle cost for sqlite-wasm | Fine for a desktop-first app. Lazy-load after first paint if it matters. |
| Sync drift / cursor corruption | Server is authoritative; on any inconsistency, drop the OPFS file and re-snapshot. Cheap. |
| Leaderboard exposes everyone's visits to every client | Hobby project, no users, not sensitive. If we ever care, precompute a `user_totals` row per user and sync only that. |
| Password auth isn't "real" | Acknowledged. It's good enough to stop casual copy-paste impersonation. OAuth can come later if it ever matters. |

---

## Open questions for Charlie

1. **Turso sync-wasm first (1-day time-box) or go straight to sqlite-wasm + hand-rolled sync?** My vote: time-box sync-wasm — if it works, we win a lot of code.
2. **Poll interval?** 5 s everywhere, or smarter (on focus + after local writes)?
3. **Everyone's visit data on every client — OK?** Enables local leaderboard. Hobby project, probably yes.
4. **Password reset flow — skip entirely?** Hobby + no users = yes, skip for now.
5. **Monorepo-ise `points.js`** (shared package for server + client) or just copy it? Copy is faster; share is cleaner. I'd copy first and promote to shared when the copy starts to hurt.

---

## Rough effort estimate

| Phase | Effort |
|---|---|
| A — Docker parity + E2E harness | ~1 day |
| 0 — bcrypt+JWT auth | ~half day |
| 1 — server change feed | ~half day |
| 2 — client sqlite-wasm + snapshot | ~1 day (incl. sync-wasm time-box) |
| 3 — incremental sync worker | ~half day (skippable if sync-wasm works) |
| 4 — kill server reads, port scoring | ~half day |
| 5 — optimistic writes | ~half day |
| 6 — reactive query hook (optional) | ~half day |

**Total for Phases A–5: ~4 days.** Phase A front-loads a day to guarantee every later phase lands with a green end-to-end signal from the same stack we'd run in production.
