# DB Speed Plan

> Plan for turning TravelPoints into a local-first web app with a real SQLite database in the browser, kept in sync with the Turso server of record. Goal: every page instant, every write 0 ms, end-to-end validated in Docker on every push.

Hobby project. No real users yet, so we're happy to drop data on any schema change. Password+JWT auth is plenty. Move fast.

> **One-time data drop.** Phase 0 rebuilds the `users` table, which wipes every existing account. This is the *last* time we're allowed to do that — once we ship Phase 0 and start inviting real users, schema changes must preserve data.

---

## Progress tracker

Top-level checkpoints. Each phase has its own checklist further down.

- [x] **Phase A** — Docker parity + E2E harness (~1 day)
- [x] **Phase 0** — Lightweight auth (bcrypt + JWT cookie, email-or-handle usernames) (~½ day)
- [x] **Phase 1** — Server change feed + debug metrics (~½ day)
- [~] **Phase 2** — Client SQLite via sqlite-wasm (~1 day) — **code in place, E2E blocked on followup task** (see "Followup: prod-shape E2E (HTTPS + cross-origin cookies)" below)
- [ ] **Phase 3** — Incremental sync worker (skip if sync-wasm handles it) (~½ day)
- [ ] **Phase 4** — Kill server reads; port `points.js` to client (~½ day)
- [ ] **Phase 5** — Optimistic writes (~½ day)
- [ ] **Phase 6** — Reactive query hook (optional) (~½ day)

**Total Phases A–5: ~4 days.**

---

## TL;DR

- SQLite in the browser via **OPFS**. All reads = local SQL, microsecond latency.
- **Writes always go through the Express API** (JWT-authed + per-route content validation). The browser never writes to the server DB directly. A server-side `_changes` feed echoes authorised writes back so the client stays in sync.
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

## Authorised writes: the server stays in the write path

Non-negotiable invariant: **every mutation to server-side data is validated by the Express API.** This holds today and must hold forever, even after we adopt any local-first sync.

**How it's enforced**

- All client-originated writes go to REST endpoints (`POST /api/users/:id/countries`, etc.). No other write path exists.
- Each write route runs, in order: (1) JWT-verify middleware, (2) ownership assertion (`req.user.id === params.user_id`), (3) **Zod content schema** on the body, (4) **business-rule checks** against the DB (e.g., `country_code` exists in `countries`; no duplicate `(user_id, country_code)`; `visited_at` not in the future).
- The `_changes` row is appended **by the route handler itself**, inside the same transaction as the validated write. No endpoint lets a client write to `_changes`.
- `GET /api/changes?since=N` is read-only — it replays what the server already authorised.
- Reference tables (`countries`, `cities`, `provinces`) have **no write routes at all**. They're seeded and considered immutable at runtime.

**The sync-wasm trap (and how we dodge it)**

`@tursodatabase/sync-wasm` v0.5 is **bidirectional**. If we used its `push()` direction, the browser would talk directly to sqld over the libsql wire protocol and bypass Express — we'd lose content validation with no sane place to bolt it back on (sqld has no real per-user RLS). 

Rule: **sync-wasm, if adopted in Phase 2, is used pull-only.** Writes always take the REST path. We explicitly do not call `push()` from the client. Optimistic UX comes from Phase 5's local-savepoint + REST POST pattern, not from the sync library.

This means we can retrofit new content checks (or a full policy layer) later without a protocol change — just add middleware to the write routes.

---

## Pinned versions (verified April 2026)

Don't float these — every one has bitten someone in the last 12 months.

| Thing | Pin | Why |
|---|---|---|
| Node | **24 LTS** (`node:24-alpine`) | Node 20 LTS ends 2026-04-30. Node 24 entered Active LTS Oct 2025 — stay on the latest supported line. |
| `ghcr.io/tursodatabase/libsql-server` | **`v0.24.32`** | Project is maintenance-only; active work moved to the Rust `tursodatabase/turso` rewrite. `:latest` could shift. |
| `nginx` | **`1.27-alpine`** | Serves the prod client bundle; pin so COOP/COEP header behaviour doesn't drift. |
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

- [x] Pin `ghcr.io/tursodatabase/libsql-server:v0.24.32` in `compose.yaml` (was `:latest`).
- [x] Multi-stage `server/Dockerfile` and `client/Dockerfile` with `dev` and `prod` targets (client `prod` stage is `nginx:1.27-alpine` serving the built bundle).
- [x] `compose.prod-build.yaml` overlay swaps both services to their `prod` targets and bakes `APP_SCHEMA_VERSION` into the client build.
- [x] `compose.test.yaml` overlay adds a `playwright:v1.58.2-noble` service on the compose network (`BASE_URL=http://client:3000`, `API_URL=http://server:3001`).
- [x] **COOP/COEP/CORP headers** set on the Vite dev server (`vite.config.js`), nginx (`client/nginx.conf`), AND Express (`server/src/middleware/coop-coep.js`) so every tier agrees.
- [x] `/api/dev/reset` mounted only when `NODE_ENV !== 'production'` (`server/src/routes/dev.js`) — truncates `user_provinces`, `user_cities`, `user_countries`, `users` and reseeds.
- [x] `make e2e` → `scripts/e2e.sh` which sets `APP_SCHEMA_VERSION`, builds, boots, waits for `/api/health`, runs Playwright, tears down on exit.
- [x] First E2E smoke test: health check returns `{status: ok, db: connected}` + header `x-app-schema-version`; root HTML responds 200 with COOP/COEP. (Signup + add-country flow will be added in Phase 0's E2E updates.)
- [x] CI `e2e` job runs `./scripts/e2e.sh` with `APP_SCHEMA_VERSION=${short_sha}`, uploads `e2e-report/` as an artifact, gates `deploy`.
- [x] CI logs node/docker/compose versions and `docker image inspect --format '{{.RepoDigests}}'` for each pinned image.

**Exit criteria:** `make e2e` goes green locally. CI runs the same command against the same pinned images.

**Decisions locked in during Phase A:**

1. **Compose naming** follows the modern Compose Specification (`compose.yaml`, no `docker-` prefix). One file per concern; legacy `docker-compose.yml` and the experimental `docker-compose.turso-test.yml` are gone.
2. **Port layout** is final: client 3000, server 3001, sqld 8080 internal (see the table above). CLAUDE.md updated to match.
3. **Node 24 LTS** across both Dockerfiles and CI — bumped from the plan's original 22 pick because 24 entered Active LTS Oct 2025 and is the current supported line.
4. **`APP_SCHEMA_VERSION = short git SHA`** baked at build time via `ARG`. Default `dev` locally so OPFS doesn't wipe on every save. No manual bumping anywhere.
5. **Migrations + seeds live in `src/index.js` only.** The old `server/entrypoint.sh` was running them a second time and has been deleted; the dev Dockerfile uses `node --watch src/index.js` as its CMD.
6. **Playwright deps** use `npm install` (not `ci`) inside the e2e container so we don't need to commit a lockfile for a one-dep project. Revisit if CI reproducibility becomes a concern.

### Phase 0 — Lightweight auth (~½ day)

Drop the localStorage-identity farce. Not "real" auth — good enough to stop casual impersonation.

- [x] Migration `20260419001_auth_rebuild_users`: drops and rebuilds `users` with `identifier TEXT NOT NULL`, `password_hash TEXT NOT NULL`, `home_country`, `created_at`. Case-insensitive unique index on `LOWER(identifier)`. Child tables (user_countries/cities/provinces) cleared first. **Final destructive users migration** — after this ships, all schema changes must preserve data.
- [x] `POST /api/auth/signup` — zod-validated identifier (handle regex OR email regex), bcrypts the password (`bcryptjs`, 12 rounds), returns `{id, identifier, home_country}` + sets the `auth` (httpOnly) and `last_identifier` (non-httpOnly) cookies.
- [x] `POST /api/auth/signin` — constant-ish timing (runs bcrypt even for unknown identifiers) to avoid enumeration; same response + cookies as signup.
- [x] `POST /api/auth/signout` — clears `auth`, keeps `last_identifier` so the form pre-fills next time.
- [x] `GET /api/auth/me` — returns `{id, identifier, home_country}` if JWT valid, 401 otherwise. Client uses this on mount to rehydrate session.
- [x] `requireAuth` + `requireOwnership('id')` middleware on every write route in `routes/users.js`. Reference-data GETs stay open for now (privacy tightening is future work; Phase 1's `users_public` already restricts what leaves the server).
- [x] **Zod body schemas + business-rule checks** in `server/src/lib/schemas.js`. On failure → 422 with `{ error, errors: [{ path, message }] }`. Same shape for schema violations and business-rule failures (duplicate, unknown code, future date).
- [x] Client: deleted `Welcome.jsx`, added `SignIn.jsx` + `SignUp.jsx`. `AuthContext` now calls `/api/auth/me` on mount. `fetch` calls use `credentials: 'include'`. `ApiError` class surfaces 422 field errors for per-field UI feedback. SignIn reads `last_identifier` cookie and pre-fills.
- [x] E2E (`e2e/tests/auth.spec.js`): signup sets both cookies with correct `httpOnly` flags, impersonation → 403, malformed body → 422 with field errors, signout clears `auth` but keeps `last_identifier`, signin round-trip + wrong-password → 401.

**Exit criteria:** you can't act as another user by editing browser storage, and malformed writes are rejected with useful errors. ✅ `make e2e` 7/7 green.

**Decisions locked in during Phase 0:**

1. **`bcryptjs`, not native `bcrypt`.** Pure-JS, no `node-gyp`/`python3` in the Alpine image, 12 rounds is still fast enough for hobby scale. Revisit only if signup becomes a bottleneck.
2. **`JWT_SECRET` is env-var-only.** Dev falls back to a literal `dev-only-unsafe-secret`. In production (`NODE_ENV=production`), the module throws at require-time if unset. CI/E2E gets a fixed ephemeral secret via compose.
3. **`COOKIE_SECURE` is a separate env knob.** Defaults to `NODE_ENV === 'production'`, but the E2E stack (which talks plain http inside the compose network) sets `COOKIE_SECURE=false` — otherwise browsers silently drop `secure` cookies and every test flakes as a 401. Render (HTTPS-terminated) inherits the default. A lesson we paid for once.
4. **422 is the uniform validation shape.** Both zod failures and business-rule failures (unknown country code, duplicate `(user, target)`, future date) return `{ error, errors: [{ path, message }] }`. The client's `ApiError.errors` surfaces field-level messages. 401 means "not signed in", 403 means "not yours", 422 means "we heard you, the body is wrong".
5. **Reference-data GETs remain open.** Privacy for per-user visit data is deferred — for now anyone can see any user's visited list. When that matters (real users, Phase 6ish), wrap those routes too.
6. **`ApiError` on the client** replaces ad-hoc error strings. Non-400 responses preserve `status` and `errors[]` so the sign-up form can map issues to fields directly.
7. **No `/api/dev/reset` in the E2E stack.** E2E uses `NODE_ENV=production`, which disables dev routes. Tests instead use unique-per-run identifiers (`${prefix}_${Date.now()}_${rand}`) so parallel workers don't collide. Keeps the prod stack clean.

### Phase 1 — Server change feed + debug metrics (~½ day)

- [x] Migration `20260419002_create_changes_feed`: `_changes (change_id INTEGER PK AUTOINCREMENT, table_name, pk, op, row_json, created_at)` + index on `(table_name, pk)` + SQLite trigger enforcing `op ∈ {insert, update, delete}`.
- [x] `server/src/lib/changes.js` — `record(trx, { table, pk, op, row })` helper. Called inside the same transaction as the write; returns the new `change_id` so routes can echo it to the client. Per decision: reference-data tables (`countries`, `cities`, `provinces`) have no write routes and therefore no change-feed entries; clients get them once via `/api/snapshot`.
- [x] Every write route wraps insert+`changes.record(...)` in `db.transaction(...)`. Applied to signup (`users`), add/delete country, add/delete city, add/delete province. Cascade deletes emit one `_changes` row per child deleted.
- [x] `GET /api/changes?since=N` → `{ changes: [...], cursor, has_more }`. Capped at 1000 rows per call. `has_more=true` signals the client to keep polling.
- [x] `GET /api/snapshot` → `{ countries, cities, provinces, users_public, cursor }`. `users_public = { id, identifier, home_country }` enforced by explicit column list; password_hash never leaks.
- [x] No seed backfill of synthetic `_changes` rows: `/api/snapshot` returns everything on cold start, so the feed starting empty is fine. Documented here.
- [x] `GET /api/debug/metrics` — dev always; prod requires `?token=<DEBUG_TOKEN>` or 404s (prevents accidental exposure when the env var isn't set). Reports `schema_version`, uptime, per-route `count/p50/p95/p99`, `_changes` row count, current max `change_id`.
- [x] `Server-Timing: total;dur=<ms>` header on every response plus in-memory metrics ring (500 samples per route). No prometheus dep — we're at hobby scale.
- [x] **Retention:** no pruning of `_changes` yet. Revisit when the table exceeds ~100k rows; at that point add a nightly job that drops rows older than the oldest active client cursor.
- [x] E2E (`e2e/tests/changes.spec.js`): snapshot shape + `users_public` keys asserted; writes surface in `/api/changes?since=N`; write responses carry `change_id`; cascade delete emits multiple `_changes` rows (one per cascaded row); `/api/changes?since=-1` → 422; `password_hash` never appears in `users` change rows.

**Exit criteria:** every write produces a `_changes` row atomically, in the same transaction. Debug metrics endpoint reachable (dev) or 404'd without token (prod). ✅ `make e2e` 12/12 green.

**Decisions locked in during Phase 1:**

1. **Write routes echo `change_id`** in their response body (`{ ..., change_id }`). Phase 5's optimistic writes will use this to fast-forward the client cursor past its own local write and skip the echo on the next poll.
2. **`users_public` is enforced at the SELECT, not by a view.** Easy to audit (one explicit column list in `routes/snapshot.js`) and automatically covered by the Phase 1 E2E test that asserts the object's keys exactly.
3. **Cascade deletes emit one `_changes` row per cascaded row**, not a single parent delete. Rationale: the client's local SQLite needs to know each row that disappeared so its own indexes stay consistent. The alternative (one parent delete, infer children) couples server and client code and would break if cascade logic diverges.
4. **Reference tables are snapshot-only.** No routes mutate `countries`/`cities`/`provinces` at runtime — they're seeded and then frozen. No `_changes` entries needed; any future change to reference data means a new migration + an `APP_SCHEMA_VERSION` bump + a client resync.
5. **Metrics are in-memory.** Deliberately per-process, no external store. Good enough for one Render container; any multi-instance deploy would need prometheus-client or similar, but that's not on the horizon.
6. **E2E tests run in parallel (7 workers).** Phase 1's changes-feed test taught us: any assertion on "total rows since cursor X" will catch parallel tests' writes. Filter by the test's own `user.id` / `pk` instead of counting. Recorded so we don't re-learn it.

### Phase 2 — Client SQLite via sqlite-wasm (~1 day) — IN PROGRESS

- [x] Skipped the sync-wasm time-box per Phase-A-era decision (recorded above). Went direct to `@sqlite.org/sqlite-wasm`.
- [x] Added `@sqlite.org/sqlite-wasm@^3.51.2-build9` to client deps. Excluded from Vite `optimizeDeps` so esbuild prebundling doesn't break its `import.meta.url`-based wasm/worker resolution.
- [x] **Architecture corrected mid-phase**: sqlite-wasm runs in a dedicated Web Worker (`client/src/db/worker.js`), not on the main thread. Reason: `FileSystemFileHandle.prototype.createSyncAccessHandle` — required by `installOpfsSAHPoolVfs` — is **Worker-only by spec**. The plan's "OO1 on main thread" note was incorrect; OO1 is the right *API*, but it has to live inside a Worker for OPFS persistence to work. We use OO1 inside the worker and a tiny promise-RPC on the main thread (`client/src/db/local.js`) so callers don't see postMessage.
- [x] DB filename and lifecycle match the plan: `/traveleria-v<APP_SCHEMA_VERSION>-<user.id>.db`, only opened after signin, closed on signout. SignIn/SignUp pages do not import `local.js`.
- [x] DDL mirrors the server schema (countries/cities/provinces/users_public + user_* visit tables + `_meta` for cursor). Idempotent hydration: re-opening with a populated `_meta.cursor` short-circuits the snapshot fetch.
- [x] Helper API exposed by `openUserDb(...)`: `entry.all(sql, bind)`, `entry.get(sql, bind)`, `entry.value(sql, bind)`, `entry.exec(sql, bind)`. All async (worker-RPC under the hood).
- [x] `AuthContext` opens the DB after signin, closes on signout, exposes `{db, dbStatus, dbError}`. `dbStatus`: `idle` → `loading` → `ready` | `error`. Infinite-retry bug fixed: effect depends on `user` only.
- [x] COOP/COEP/CORP headers verified in nginx + Vite + Express (already in place from Phase A).
- [x] E2E test scaffold in `e2e/tests/local-db.spec.js`: cold-boot → snapshot → counts > 100; reload → cursor preserved → no second snapshot fetch. **Currently `test.describe.skip`** — see followup task below. Set `TRAVELERIA_OPFS_E2E=1` to re-enable once the followup lands.

**Why E2E is skipped:** the prod-build E2E stack runs over plain `http://` inside the compose network. Chromium's secure-context gate disables `createSyncAccessHandle` even in a Worker; `--unsafely-treat-insecure-origin-as-secure` doesn't reliably propagate to dedicated Workers. Real browsers (Chrome on `localhost:3000`, Render prod over HTTPS) do not have this problem.

**Manual verification before declaring Phase 2 done:** run the dev stack on macOS (`make up`), sign up at `http://localhost:3000`, open DevTools → Application → Storage → IndexedDB / Origin Private File System, and confirm a `traveleria-v<sha>-<uuid>.db` file exists with populated tables. Should be a 5-minute check once the next session is in front of a real browser.

**Exit criteria** (unchanged): after one cold boot, the app runs all read paths without hitting the network for reference data. Phase 4 wires the actual UI to `entry.all(...)` etc.

---

## Followup: prod-shape E2E (HTTPS + cross-origin cookies)

**Standalone task for a fresh context.** Self-contained, doesn't block Phase 3 from being designed but does block Phase 2's E2E coverage.

**Why it matters.** Production runs split client + API origins (Render serves them as separate services). Local + E2E must mirror that topology — no silent compromises like an nginx `/api` proxy in the client container, because that doesn't exist in prod. Two things break under plain http+split-origin in the E2E stack:

1. **OPFS / `createSyncAccessHandle`** is gated by a secure context. Plain http in a docker network ≠ secure. `--unsafely-treat-insecure-origin-as-secure` does not propagate to Workers reliably.
2. **`SameSite=Lax` cookies** are not sent on cross-site subresource fetches (e.g. AJAX from `client:3000` → `server:3001`). Today our auth cookie is `SameSite=Lax`, so once a page is loaded from one origin, it can't authenticate to the other via fetch. This must already be a question for Render prod — needs deciding.

**Constraint from product owner.** The E2E stack must use the **same tier shape** as prod (split client + API). No proxy compromises in the client container. The fix lives in transport (TLS) and cookie policy, not topology.

**Scope.**
1. Decide cookie strategy for split-origin prod:
   - Same registrable domain on Render? Then `SameSite=Lax` works for top-level navigation but still not for AJAX subresources. Need `SameSite=None; Secure` for AJAX cross-site auth.
   - Different registrable domains? `SameSite=None; Secure` is mandatory.
   - Update `server/src/lib/auth.js → cookieOpts` accordingly. Keep `COOKIE_SECURE` env honest with the chosen mode.
2. Add HTTPS termination to the E2E compose stack:
   - Generate a self-signed cert in `scripts/e2e.sh` (openssl one-liner, output to a gitignored `scripts/e2e-certs/`).
   - Mount it into the client (nginx) and server (Express via `https.createServer` or a separate nginx in front of server) containers.
   - Update `BASE_URL`/`API_URL` in `compose.test.yaml` to `https://...`. Update `VITE_API_URL` build arg likewise.
   - `e2e/playwright.config.js`: add `use.ignoreHTTPSErrors: true`. Drop the `--unsafely-treat-insecure-origin-as-secure` arg — no longer needed.
3. Re-enable Phase 2 E2E: `TRAVELERIA_OPFS_E2E=1` env on the e2e service; verify both `local-db` tests pass.
4. Verify all 14 tests still green under HTTPS.
5. Document the cookie + cert scheme in this doc under a new "Cookies & TLS" section so it's not folklore.

**Out of scope.** Don't touch the prod-build Dockerfile beyond what's needed for HTTPS termination. Don't add intermediate proxies. Don't change tier topology.

**Estimated effort:** ~2-3 hours in a focused fresh context.

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
- [ ] Mirror the server's `__tests__/points.test.js` under `client/src/lib/__tests__/points.test.js` (same assertions, same fixtures) — run with **Vitest** (matches the Vite toolchain; do not add Jest to the client). Both suites run in CI.
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

- **No manual version bumping.** `APP_SCHEMA_VERSION` is the **short git SHA** (7 chars) baked into the Docker images at build time via `ARG APP_SCHEMA_VERSION` — set in CI from `$(git rev-parse --short HEAD)` and defaulted to the literal string `dev` in both Dockerfiles so local dev stays stable.
- Server reads `process.env.APP_SCHEMA_VERSION` via `server/src/lib/schema-version.js` and middleware stamps `X-App-Schema-Version: <sha>` on every response.
- Client reads `import.meta.env.VITE_APP_SCHEMA_VERSION`, set at build time from the same arg. One value, two code paths — drift is impossible because they read the same build-arg.
- Every push to main ⇒ new SHA ⇒ clients on the old bundle re-snapshot on their next request. At hobby scale a fresh snapshot is cheap. Revisit only if we outgrow that.
- Mismatch at runtime → delete **every** `traveleria-v*.db` in OPFS (not just the current user's), show an "Updating…" splash, hard-reload. No user-data migration; we just drop.

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

Modern Compose Specification naming (`compose.yaml`, no `docker-` prefix). Legacy `docker-compose.yml` and `docker-compose.turso-test.yml` have been removed — there is one source of truth.

```
compose.yaml             # shared base; dev targets and default envs
compose.override.yaml    # auto-loaded by `docker compose up` — adds dev bind mounts
compose.prod-build.yaml  # overlay: prod targets, nginx-served client, baked schema SHA
compose.test.yaml        # overlay: adds the Playwright runner
```

`docker compose up` (no `-f`) loads `compose.yaml` + `compose.override.yaml` automatically → dev stack with hot reload. `scripts/e2e.sh` passes `-f compose.yaml -f compose.prod-build.yaml -f compose.test.yaml` explicitly, which means the override is skipped and the E2E run exercises the real bundle.

### Ports (locked in)

| Service | Host port | Container port | Exposed? |
|---|---|---|---|
| Vite dev / nginx prod (client) | 3000 | 3000 | ✅ `localhost:3000` |
| Express API (server) | 3001 | 3001 | ✅ `localhost:3001` |
| sqld (libSQL) | — | 8080 | ❌ internal compose network only |

CLAUDE.md, compose files, Vite config, nginx config, server `PORT`, and CI all agree. If any disagree, that is a bug — fix it, don't work around it.

### The E2E suite (one test per concern)

1. **Cold boot** — fresh browser, empty OPFS → `/api/snapshot` → countries render from local SQLite.
2. **Auth** — signup → `auth` cookie set → `last_identifier` cookie set → signout clears `auth` but leaves `last_identifier` → signin round-trip.
3. **Impersonation blocked** — `POST /api/users/<other_id>/countries` → 403.
4. **Content validation** — malformed body (missing field, bogus country code, duplicate visit, future date) → 422 with field errors; `_changes` table unchanged.
5. **Write + sync echo** — add a country → local DB reflects instantly → server `_changes` contains the row → second browser context picks it up.
6. **Schema-version reload** — server bumps `APP_SCHEMA_VERSION` → client detects mismatch → OPFS wiped → fresh snapshot.
7. **Scoring parity** — fixed fixture; server total === client total.
8. **Leaderboard parity** — same user set; server-computed === client-computed.
9. **Offline blip** — stop the server → add a country → optimistic UI stays → restart → reconciles.

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
| sync-wasm's bidirectional mode would bypass API content validation | **Rule: pull-only use.** Writes always take the REST path. Enforced by convention (we never import `push()`) and verified by the content-validation E2E test — if writes reached the DB without Express auth, those tests would fail to reject bad input. |
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
