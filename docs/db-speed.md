# DB Speed Plan

> Plan for turning TravelPoints into a local-first web app with a real SQLite database in the browser, kept in sync with the Turso server of record. Goal: every page instant, every write 0 ms, end-to-end validated on every push.

Hobby project. No real users yet, so we're happy to drop data on any schema change. Password + JWT auth is plenty. Move fast.

> **One-time data drop.** Phase 0 rebuilt the `users` table, which wipes every existing account. This is the *last* time we're allowed to do that — once we ship to main and start inviting real users, schema changes must preserve data.

---

## Progress tracker

- [x] **Phase A** — Docker parity + E2E harness (~1 day)
- [x] **Phase 0** — bcrypt + JWT bearer auth, email-or-handle usernames (~½ day)
- [x] **Phase 1** — Server change feed + debug metrics (~½ day)
- [x] **Phase 2** — Client SQLite via `@sqlite.org/sqlite-wasm` over OPFS (~1 day)
- [ ] **Phase 3** — Incremental sync worker (~½ day)
- [ ] **Phase 4** — Kill server reads; port `points.js` to client (~½ day)
- [ ] **Phase 5** — Optimistic writes (~½ day)
- [ ] **Phase 6** — Reactive query hook (optional) (~½ day)

**Total Phases A–5: ~4 days.**

---

## TL;DR

- SQLite in the browser via **OPFS**. All reads = local SQL, microsecond latency.
- **Writes always go through the Express API** (JWT-authed + per-route Zod validation). The browser never writes to the server DB directly. A server-side `_changes` feed echoes authorised writes back so the client stays in sync.
- Scoring moves to the client by sharing `server/src/lib/points.js` via copy + CI-diff (see Phase 4).
- Schema updates: a single `APP_SCHEMA_VERSION` integer (short git SHA). Mismatch → client wipes its OPFS DB and hard-reloads. No migration logic, ever.
- Every tier runs the same binaries in dev, CI, and prod.

---

## Architecture

```
Browser (SPA)
┌──────────────────────────────────────────────────────────┐
│  SQLite WASM (OPFS-backed, persistent across reloads)    │
│    ├── countries, cities, provinces       (ref data)     │
│    ├── users_public, user_countries, user_cities,        │
│    │   user_provinces                                    │
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
  - Auth: bcrypt + JWT bearer token (Authorization header)
  - Owns writes and schema (Knex migrations)
  - _changes table — every write appends (change_id, table, pk, op, row_json)
  - /api/snapshot: full JSON dump + current change_id
  - /api/changes?since=N: rows + tombstones since N
  - /api/debug/metrics: request timings, sync stats (dev + behind token in prod)
  - APP_SCHEMA_VERSION header on every response
```

---

## Authorised writes: the server stays in the write path

Non-negotiable invariant: **every mutation to server-side data is validated by the Express API.** This holds today and must hold forever, even as we adopt local-first sync.

**How it's enforced**

- All client-originated writes go to REST endpoints (`POST /api/users/:id/countries`, etc.). No other write path exists.
- Each write route runs, in order: (1) JWT-verify middleware (bearer from `Authorization` header), (2) ownership assertion (`req.user.id === params.user_id`), (3) **Zod content schema** on the body, (4) **business-rule checks** against the DB (e.g., `country_code` exists in `countries`; no duplicate `(user_id, country_code)`; `visited_at` not in the future).
- The `_changes` row is appended **by the route handler itself**, inside the same transaction as the validated write. No endpoint lets a client write to `_changes`.
- `GET /api/changes?since=N` is read-only — it replays what the server already authorised.
- Reference tables (`countries`, `cities`, `provinces`) have **no write routes at all**. They're seeded and considered immutable at runtime.

---

## Cookies & cross-origin in prod

Prod runs split client + API on Render — `travelpoints-web.onrender.com` and `travelpoints-api.onrender.com`. `onrender.com` is on the Public Suffix List, so those subdomains are **cross-site** from the browser's perspective.

**Decision: JWT in `Authorization: Bearer <token>` header, not a cookie.**

- Token is stored in `localStorage` on the client, sent on every API call via `fetch` with `Authorization: Bearer <token>`.
- Server extracts the token from the header, verifies, attaches `req.user`. No cookie round-trip.
- CORS allows the web origin and exposes the `Authorization` header.
- `last_identifier` stays as a non-httpOnly cookie on the client's own origin — it's a UX pre-fill hint, not auth, and never needs to cross origins.

**Why not `SameSite=None; Secure` cookies?** Safari blocks third-party cookies by default already; Chrome is on the same path. Bearer tokens don't care about any of that.

**XSS trade-off acknowledged.** A bearer token in `localStorage` is readable by any script on the web origin. Our bundle has no third-party scripts, no user-rendered HTML, no `dangerouslySetInnerHTML`, and strict COOP/COEP. For this scale, the risk is acceptable.

---

## Pinned versions (verified April 2026)

Don't float these — every one has bitten someone in the last 12 months.

| Thing | Pin | Why |
|---|---|---|
| Node | **24 LTS** (`node:24-alpine`) | Node 20 LTS ends 2026-04-30. Node 24 entered Active LTS Oct 2025 — stay on the latest supported line. |
| `ghcr.io/tursodatabase/libsql-server` | **`v0.24.32`** | Project is maintenance-only; active work moved to the Rust `tursodatabase/turso` rewrite. `:latest` could shift. |
| `nginx` | **`1.27-alpine`** | Serves the prod client bundle; pin so COOP/COEP header behaviour doesn't drift. |
| `@libsql/client` | latest stable | One client for local file, dockerised sqld, and Turso cloud — three URL schemes, one code path. Don't mix in `better-sqlite3`. |
| `@sqlite.org/sqlite-wasm` | **`^3.51.2-build8`** | Use the OO1 API from inside a Web Worker (OPFS requires it). |
| `@playwright/test` | **`1.58.2`** | Runs on the host (see Phase 2 decisions). Chromium version is pinned by the npm package; `make e2e-install` resolves it. |

CI logs installed versions at the start of every E2E run so drift is visible in the report.

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

- [x] Pin `ghcr.io/tursodatabase/libsql-server:v0.24.32` in `compose.yaml` (was `:latest`).
- [x] Multi-stage `server/Dockerfile` and `client/Dockerfile` with `dev` and `prod` targets (client `prod` stage is `nginx:1.27-alpine` serving the built bundle).
- [x] `compose.prod-build.yaml` overlay swaps both services to their `prod` targets and bakes `APP_SCHEMA_VERSION` into the client build.
- [x] **COOP/COEP/CORP headers** set on the Vite dev server (`vite.config.js`), nginx (`client/nginx.conf`), AND Express (`server/src/middleware/coop-coep.js`) so every tier agrees.
- [x] `/api/dev/reset` mounted only when `NODE_ENV !== 'production'` — truncates user tables and reseeds.
- [x] `make e2e` → `scripts/e2e.sh` which sets `APP_SCHEMA_VERSION`, builds, boots, waits for `/api/health`, runs Playwright on the host, tears down on exit.
- [x] First E2E smoke test: health check returns `{status: ok, db: connected}` + `x-app-schema-version` header; root HTML responds 200 with COOP/COEP.
- [x] CI `e2e` job runs `make e2e` with `APP_SCHEMA_VERSION=${short_sha}`, uploads `e2e-report/` as an artifact, gates `deploy`.

**Exit criteria:** `make e2e` goes green locally. CI runs the same command against the same pinned images. ✅

**Decisions locked in during Phase A:**

1. **Compose naming** follows the modern Compose Specification (`compose.yaml`, no `docker-` prefix). One file per concern.
2. **Port layout** is final: client 3000, server 3001, sqld 8080 internal.
3. **Node 24 LTS** across both Dockerfiles and CI.
4. **`APP_SCHEMA_VERSION = short git SHA`** baked at build time via `ARG`. Default `dev` locally so OPFS doesn't wipe on every save.
5. **Migrations + seeds live in `src/index.js` only.** The old `server/entrypoint.sh` was running them a second time and has been deleted; the dev Dockerfile uses `node --watch src/index.js` as its CMD.
6. **Playwright deps** use `npm install` (not `ci`) so we don't need to commit a lockfile for a single-dep project.

### Phase 0 — Lightweight auth (~½ day)

Drop the localStorage-identity farce. Not "real" auth — good enough to stop casual impersonation.

- [x] Migration `20260419001_auth_rebuild_users`: drops and rebuilds `users` with `identifier TEXT NOT NULL`, `password_hash TEXT NOT NULL`, `home_country`, `created_at`. Case-insensitive unique index on `LOWER(identifier)`. **Final destructive users migration.**
- [x] `POST /api/auth/signup` — Zod-validated identifier (handle regex OR email regex), bcrypts the password (`bcryptjs`, 12 rounds), returns `{ user, token }` where `token` is the signed JWT.
- [x] `POST /api/auth/signin` — constant-ish timing (runs bcrypt even for unknown identifiers) to avoid enumeration; same response shape as signup.
- [x] `POST /api/auth/signout` — server-side is a no-op (bearer tokens are stateless); client discards the token. Keeps the `last_identifier` cookie so the sign-in form pre-fills.
- [x] `GET /api/auth/me` — returns `{id, identifier, home_country}` if the bearer token is valid, 401 otherwise. Client uses this on mount to rehydrate the session.
- [x] `requireAuth` + `requireOwnership('id')` middleware on every write route in `routes/users.js`.
- [x] **Zod body schemas + business-rule checks** in `server/src/lib/schemas.js`. On failure → 422 with `{ error, errors: [{ path, message }] }`.
- [x] Client: deleted `Welcome.jsx`, added `SignIn.jsx` + `SignUp.jsx`. `AuthContext` stores the token in `localStorage`, sends `Authorization: Bearer <token>` on every fetch, calls `/api/auth/me` on mount to rehydrate. `ApiError` class surfaces 422 field errors for per-field UI feedback. SignIn reads `last_identifier` cookie and pre-fills.
- [x] E2E (`e2e/tests/auth.spec.js`): signup returns a token, impersonation → 403, malformed body → 422 with field errors, signout clears the stored token, signin round-trip + wrong-password → 401.

**Exit criteria:** you can't act as another user by editing browser storage, and malformed writes are rejected with useful errors. ✅

**Decisions locked in during Phase 0:**

1. **`bcryptjs`, not native `bcrypt`.** Pure-JS, no `node-gyp`/`python3` in the Alpine image, 12 rounds is still fast enough for hobby scale.
2. **`JWT_SECRET` is env-var-only.** Dev falls back to a literal `dev-only-unsafe-secret`. In production (`NODE_ENV=production`), the module throws at require-time if unset. CI/E2E gets a fixed ephemeral secret via compose.
3. **JWT in `Authorization: Bearer <token>` header, not a cookie.** See the "Cookies & cross-origin" section above for the full reasoning.
4. **422 is the uniform validation shape.** Both Zod failures and business-rule failures (unknown country code, duplicate `(user, target)`, future date) return `{ error, errors: [{ path, message }] }`. 401 means "not signed in", 403 means "not yours", 422 means "we heard you, the body is wrong".
5. **Reference-data GETs remain open.** Privacy for per-user visit data is deferred.
6. **`ApiError` on the client** replaces ad-hoc error strings. Non-400 responses preserve `status` and `errors[]` so forms can map issues to fields directly.

### Phase 1 — Server change feed + debug metrics (~½ day)

- [x] Migration `20260419002_create_changes_feed`: `_changes (change_id INTEGER PK AUTOINCREMENT, table_name, pk, op, row_json, created_at)` + index on `(table_name, pk)` + SQLite trigger enforcing `op ∈ {insert, update, delete}`.
- [x] `server/src/lib/changes.js` — `record(trx, { table, pk, op, row })` helper. Called inside the same transaction as the write; returns the new `change_id` so routes can echo it to the client.
- [x] Every write route wraps insert + `changes.record(...)` in `db.transaction(...)`. Cascade deletes emit one `_changes` row per child deleted.
- [x] `GET /api/changes?since=N` → `{ changes, cursor, has_more }`. Capped at 1000 rows per call.
- [x] `GET /api/snapshot` → `{ countries, cities, provinces, users_public, cursor }`. `users_public = { id, identifier, home_country }` enforced by explicit column list; password_hash never leaks.
- [x] `GET /api/debug/metrics` — dev always; prod requires `?token=<DEBUG_TOKEN>` or 404s. Reports `schema_version`, uptime, per-route `count/p50/p95/p99`, `_changes` row count, current max `change_id`.
- [x] `Server-Timing: total;dur=<ms>` header on every response plus in-memory metrics ring (500 samples per route).
- [x] **Retention:** no pruning of `_changes` yet. Revisit when the table exceeds ~100k rows.
- [x] E2E (`e2e/tests/changes.spec.js`): snapshot shape + `users_public` keys asserted; writes surface in `/api/changes?since=N`; cascade delete emits multiple `_changes` rows; `password_hash` never appears in `users` change rows.

**Exit criteria:** every write produces a `_changes` row atomically, in the same transaction. Debug metrics endpoint reachable (dev) or 404'd without token (prod). ✅

**Decisions locked in during Phase 1:**

1. **Write routes echo `change_id`** in their response body. Phase 5's optimistic writes will use this to fast-forward the client cursor past its own local write.
2. **`users_public` is enforced at the SELECT, not by a view.** Easy to audit (one explicit column list) and automatically covered by the Phase 1 E2E test.
3. **Cascade deletes emit one `_changes` row per cascaded row**, not a single parent delete. The client's local SQLite needs each row-level tombstone for its indexes to stay consistent.
4. **Reference tables are snapshot-only.** No runtime mutations. Changing them means a new migration + `APP_SCHEMA_VERSION` bump + client resync.
5. **Metrics are in-memory.** Deliberately per-process, no external store.
6. **E2E tests run in parallel (7 workers).** Any "total rows since cursor X" assertion will catch parallel tests' writes. Filter by the test's own `user.id` / `pk` instead of counting.

### Phase 2 — Client SQLite via sqlite-wasm (~1 day)

- [x] `@sqlite.org/sqlite-wasm@^3.51.2-build8` in client deps. Excluded from Vite `optimizeDeps` so esbuild prebundling doesn't break its `import.meta.url`-based wasm/worker resolution.
- [x] sqlite-wasm runs in a dedicated Web Worker (`client/src/db/worker.js`). Reason: `FileSystemFileHandle.prototype.createSyncAccessHandle` — required by `installOpfsSAHPoolVfs` — is **Worker-only by spec**. Main thread talks to the worker via a tiny promise-RPC in `client/src/db/local.js`.
- [x] DB filename and lifecycle: `/traveleria-v<APP_SCHEMA_VERSION>-<user.id>.db`, only opened after signin, closed on signout.
- [x] DDL mirrors the server schema. Idempotent hydration: re-opening with a populated `_meta.cursor` short-circuits the snapshot fetch.
- [x] Helper API from `openUserDb(...)`: `entry.all(sql, bind)`, `entry.get(sql, bind)`, `entry.value(sql, bind)`, `entry.exec(sql, bind)`. All async.
- [x] `AuthContext` opens the DB after signin, closes on signout, exposes `{db, dbStatus, dbError}`.
- [x] COOP/COEP/CORP headers in nginx + Vite + Express.
- [x] E2E test `e2e/tests/local-db.spec.js`: cold-boot → snapshot → counts > 100; reload → cursor preserved → zero snapshot fetches.

**Exit criteria:** after one cold boot, the app runs all read paths without hitting the network for reference data. Phase 4 wires the actual UI to `entry.all(...)` etc. ✅

**Decisions locked in during Phase 2:**

1. **Playwright runs on the host, not in a container.** `localhost:3000` / `localhost:3001` is always a secure context → OPFS works without TLS or flags. Tier shape is preserved (client + API still run as split services in compose). `scripts/e2e.sh` installs Playwright on the host and runs `npx playwright test` — no `compose.test.yaml`, no cert plumbing. Auth is bearer-token, so cross-origin cookie policy doesn't factor in.
2. **`VITE_API_URL` in the prod-build stack is `http://localhost:3001`.** The baked bundle must reference a URL reachable from the host (where Chromium is), not the compose-internal `server:3001`. Render prod overrides this at build time with the real public API URL.
3. **Two real bugs that manual Chrome verification caught** (recorded because the lesson is "manual smoke test before ticking a phase, always"):
   - `provinces.id` in the Worker DDL was `INTEGER PRIMARY KEY` but the server emits UUID strings. SQLite rejects non-integers bound to an INTEGER PK (rowid alias). Fixed to `TEXT PRIMARY KEY`.
   - `AuthContext` `useEffect` depended on `user` (the whole object). StrictMode double-invokes the mount effect, and `fetchCurrentUser` resolves twice with two distinct user objects that share an `id`. The first `openUserDb` fired, but before its `.then` ran, the effect re-ran with the second user reference → set `cancelled = true` on the first closure → the `activeUserId` ref guard then skipped retrying. Fixed by depending on `user?.id` instead of `user`.

### Phase 3 — Incremental sync worker (~½ day)

- [ ] Poller: `/api/changes?since=<cursor>` every 5 s, plus on `focus` and `visibilitychange`.
- [ ] Apply each change in one transaction: `INSERT OR REPLACE` for insert/update, `DELETE` for delete.
- [ ] Persist the cursor inside the OPFS DB (`_meta` table), not localStorage.
- [ ] On any response with `X-App-Schema-Version` ≠ client's → wipe OPFS DB, reload page.
- [ ] E2E: write from browser A → browser B (incognito context) sees the new row within one poll.

**Exit criteria:** two browsers converge within 5–10 s of any write.

### Phase 4 — Kill server reads, move scoring to the client (~½ day)

- [ ] Port `server/src/lib/points.js` to `client/src/lib/points.js` via `cp server/src/lib/points.js client/src/lib/points.js`.
- [ ] CI step that `diff`s the two files and fails with a clear message if they diverge.
- [ ] Mirror the server's `__tests__/points.test.js` under `client/src/lib/__tests__/points.test.js` (same assertions, same fixtures) — run with **Vitest**.
- [ ] Delete from `client/src/api/client.js`: `getCountries`, `getCountry`, `getUserCountries`, `getUserScore`, `getLeaderboard`. Replace each call site with a local SQL query.
- [ ] Leaderboard is a client-side query: per-user totals from synced `user_countries` rows, `ORDER BY total DESC LIMIT 50`.
- [ ] E2E golden test: scoring parity — for a fixed fixture (10 visited countries, known home), server total === client total.

**Exit criteria:** grepping the client for the deleted `getX` functions returns nothing. `diff server/src/lib/points.js client/src/lib/points.js` is empty in CI.

### Phase 5 — Optimistic writes (~½ day)

- [ ] `POST /api/users/:id/countries` returns `{ change_id, row }` in the response body.
- [ ] Client wraps every mutation: write to local SQLite inside a savepoint → fire the network call → on success commit + fast-forward cursor past the returned `change_id` → on failure rollback savepoint and show a toast.
- [ ] E2E: stop the `server` container mid-session → add a country → UI updates instantly (optimistic) → restart server → next poll reconciles cleanly.

**Exit criteria:** the "add country" interaction has zero visible latency on a healthy network.

### Phase 6 — Reactive query hook (optional, ~½ day)

- [ ] `useSqlQuery(sql, params)` — re-runs the query after every successful sync tick or local mutation, returns `{ rows, loading }`.
- [ ] Rewrite Dashboard and CountryDetail to use it.
- [ ] E2E: observe that a second-tab write causes the first tab's UI to update on the next poll without any page-level refetch.

**Exit criteria:** pages don't manage their own data-fetch state.

---

## Schema updates & the web-app-reload story

- **No manual version bumping.** `APP_SCHEMA_VERSION` is the **short git SHA** (7 chars), baked into the Docker images at build time via `ARG APP_SCHEMA_VERSION`. CI sets it from `$(git rev-parse --short HEAD)`; both Dockerfiles default to the literal string `dev` so local dev stays stable.
- Server reads `process.env.APP_SCHEMA_VERSION` via `server/src/lib/schema-version.js` and middleware stamps `X-App-Schema-Version: <sha>` on every response.
- Client reads `import.meta.env.VITE_APP_SCHEMA_VERSION`, set at build time from the same arg. One value, two code paths — drift is impossible.
- Every push to main ⇒ new SHA ⇒ clients on the old bundle re-snapshot on their next request.
- Mismatch at runtime → delete **every** `traveleria-v*.db` in OPFS (not just the current user's), show an "Updating…" splash, hard-reload. No user-data migration; we just drop.

---

## Local parity & end-to-end validation

**Rule:** every tier runs the same binaries in dev, CI, and prod. No "works on my machine" gap.

| Tier | Production | Local / CI | Parity |
|---|---|---|---|
| Primary DB | Turso cloud (libSQL) | `libsql-server:v0.24.32` (sqld) | ✅ |
| App server | Node 24 + Express | identical Dockerfile | ✅ |
| Client | Vite build, statically hosted (nginx) | same, via `compose.prod-build.yaml` | ✅ |
| Browser SQLite | `@sqlite.org/sqlite-wasm` on OPFS | same, in headless Chromium under Playwright | ✅ |
| E2E runner | — | `@playwright/test` on the host | ✅ |

### Compose layout

```
compose.yaml             # shared base; dev targets and default envs
compose.override.yaml    # auto-loaded by `make up` — adds dev bind mounts
compose.prod-build.yaml  # overlay: prod targets, nginx-served client, baked schema SHA
```

`make up` loads `compose.yaml` + `compose.override.yaml` → dev stack with hot reload. `make e2e` (= `scripts/e2e.sh`) passes `-f compose.yaml -f compose.prod-build.yaml` explicitly, which skips the override and exercises the real bundle. Playwright runs on the host.

### Ports (locked in)

| Service | Host port | Container port | Exposed? |
|---|---|---|---|
| Vite dev / nginx prod (client) | 3000 | 3000 | ✅ `localhost:3000` |
| Express API (server) | 3001 | 3001 | ✅ `localhost:3001` |
| sqld (libSQL) | — | 8080 | ❌ internal compose network only |

If any of CLAUDE.md, Makefile, compose files, Vite config, nginx config, server `PORT`, and CI disagree, that's a bug — fix it.

### The E2E suite (one test per concern)

1. **Cold boot** — fresh browser, empty OPFS → `/api/snapshot` → counts from local SQLite.
2. **Auth** — signup returns a token → `last_identifier` cookie set → signout clears the stored token but leaves `last_identifier` → signin round-trip.
3. **Impersonation blocked** — `POST /api/users/<other_id>/countries` → 403.
4. **Content validation** — malformed body → 422 with field errors; `_changes` table unchanged.
5. **Write + sync echo** — add a country → local DB reflects instantly → server `_changes` contains the row → second browser context picks it up.
6. **Schema-version reload** — server bumps `APP_SCHEMA_VERSION` → client detects mismatch → OPFS wiped → fresh snapshot.
7. **Scoring parity** — fixed fixture; server total === client total.
8. **Leaderboard parity** — same user set; server-computed === client-computed.
9. **Offline blip** — stop the server → add a country → optimistic UI stays → restart → reconciles.

---

## Debug / metrics

- **Server**: `/api/debug/metrics` — per-route request counts, p50/p95, `_changes` size, current max `change_id`.
- **Server-Timing** header on every response so browser DevTools shows per-route timing natively.
- **Client**: `console.group` any sync tick that applies >0 changes; log the count and wall-clock duration.
- **Sync lag gauge** (dev-only): tiny footer widget showing `local_cursor` vs `server_max_change_id` so drift is visible at a glance.

---

## Risk list

| Risk | Mitigation |
|---|---|
| Bearer token in `localStorage` is readable by any script on our origin | No third-party scripts in the bundle; no `dangerouslySetInnerHTML`; COOP/COEP strict. Revisit if we ever render user-supplied HTML. |
| OPFS / Worker threads need COOP/COEP headers | Baked into Vite, nginx, and Express. Playwright test fails fast if missing. |
| ~1 MB gz sqlite-wasm bundle | Fine for desktop. Lazy-load after first paint if it starts to hurt. |
| Sync drift / cursor corruption | Server authoritative; any inconsistency → wipe OPFS + re-snapshot. |
| Leaderboard exposes everyone's visits to every client | Acceptable today (no real users). If it matters, sync a precomputed `user_totals` row instead. |
| `libsql-server` project is maintenance-only | Pin to `v0.24.32`. If the Turso Rust rewrite becomes the deployment target, revisit. |

---

## Open questions for Charlie

1. Poll interval (Phase 3): 5 s blanket, or smarter (on focus + after local writes)?
2. Identifier rules: minimum handle length 3 chars OK? Email validation strict or loose?

---

## Rough effort estimate

| Phase | Effort |
|---|---|
| A — Docker parity + E2E harness | ~1 day |
| 0 — bcrypt + JWT bearer auth | ~½ day |
| 1 — server change feed + metrics | ~½ day |
| 2 — client sqlite-wasm + snapshot | ~1 day |
| 3 — incremental sync worker | ~½ day |
| 4 — kill server reads, port scoring | ~½ day |
| 5 — optimistic writes | ~½ day |
| 6 — reactive query hook (optional) | ~½ day |

**Total for Phases A–5: ~4 days.**
