# Local DB Loading Resilience (Safari iOS / multi-tab hang)

**Status:** complete
**Branch:** `claude/safari-ios-loading-issue-0l9c9g`

## The bug report

- On Safari on iOS, users saw a warning "about private or something", then the app
  sat on **"Loading your travel data…"** forever. Reloading never helped.
- On Chrome it occasionally happened too — closing the tab and reopening the site
  fixed it, but a plain reload did not.

## Investigation

Both symptoms were reproduced locally against the prod-shape client build
(Playwright driving real WebKit and Chromium), and both trace back to the same
architectural fact: the client keeps its local SQLite in the browser via
sqlite-wasm's **OPFS SyncAccessHandle pool VFS** (`installOpfsSAHPoolVfs`), which
has two hard environmental requirements the app didn't handle failing.

### Root cause 1 — Safari Private Browsing has no OPFS

WebKit does not expose the Origin Private File System in Private Browsing —
"The API is currently unavailable for Safari windows in Private Browsing mode"
([WebKit blog](https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/));
`navigator.storage.getDirectory()` fails
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/getDirectory)).
So in a private tab, `installOpfsSAHPoolVfs` rejects with
**"Missing required OPFS APIs."** — reproduced verbatim in WebKit. The "private"
warning the users saw is iOS Safari's own Private Browsing notice; since the tab
stays private after a reload, the app could never load. This is the Safari
symptom.

### Root cause 2 — the SAH pool takes exclusive locks; orphaned locks survive reloads

The SAH pool VFS "does not support multiple simultaneous connections" — it
pre-allocates access handles for every file in the pool, which locks them
([SQLite persistence docs](https://sqlite.org/wasm/doc/trunk/persistence.md)).
A second tab — or a reload whose previous worker's handles were never released —
fails with **"Access Handles cannot be created if there is another open Access
Handle…"** (reproduced verbatim in Chromium). Chromium is known to keep orphaned
handles locked across reloads and only free them on tab close
([emscripten#24648](https://github.com/emscripten-core/emscripten/issues/24648),
[duckdb-wasm#2111](https://github.com/duckdb/duckdb-wasm/issues/2111)) — which is
exactly why closing the Chrome tab fixed it and reloading didn't. The worker's
existing self-heal only wrapped `new pool.OpfsSAHPoolDb(...)`, but the failure
happens earlier, inside `installOpfsSAHPoolVfs()`.

### Root cause 3 — the UI can't show a DB error

`AuthContext` correctly flipped `dbStatus` to `'error'` in both cases, but every
page gates rendering on `if (loading || dbStatus !== 'ready')` → spinner. An
error state was therefore indistinguishable from loading: the infinite
"Loading your travel data…" in the screenshot.

## The fix

Server data is authoritative (the local DB is a cache hydrated from
`/api/snapshot` and kept fresh by the changes feed), which allows graceful
degradation:

1. **In-memory fallback** (`client/src/db/worker.js`): if OPFS acquisition fails
   for any reason (missing APIs, locked pool), the worker opens a session-only
   `:memory:` database instead. It hydrates from `/api/snapshot` and syncs and
   mutates exactly like the OPFS one — it just doesn't survive a reload. The open
   result now reports `storage: 'opfs' | 'memory'`.
2. **Visible degradation** (`client/src/components/Layout.jsx`): in memory mode a
   banner explains that data still saves to the account but won't be kept on the
   device — no hidden behaviour, per the transparency principle.
3. **Error screen instead of eternal spinner** (`Layout.jsx`): `dbStatus ===
   'error'` (e.g. snapshot fetch failed on a cold load) now renders an
   explanation with a **Try again** button, centrally, so no page needed
   changing.
4. **Init watchdog** (`client/src/db/local.js`): the whole open sequence is raced
   against a 45 s timeout because sqlite-wasm init has a documented
   never-settling failure mode on Safari
   ([sqlite-wasm#79](https://github.com/sqlite/sqlite-wasm/issues/79)).

Existing Chromium behaviour is unchanged: when OPFS works (the normal single-tab
case) the persistent path is taken exactly as before — verified by the untouched
e2e suite, including "OPFS DB persists across reloads".

## Testing Safari without a Mac

Playwright's Linux WebKit build ships **without the File System API entirely**
(verified by probing; same wall Cypress hit —
[cypress#30270](https://github.com/cypress-io/cypress/issues/30270)). That makes
it useless for the OPFS happy path but a **deterministic stand-in for iOS Safari
Private Browsing**. The new `webkit` Playwright project runs only
`e2e/tests/loading-resilience.spec.js`:

- *(webkit + chromium)* signed-in app reaches ready; asserts `storage ===
  'memory'` on WebKit and `'opfs'` on Chromium.
- *(chromium)* a second tab loads via the fallback while the first keeps its
  OPFS pool; asserts the banner is shown.

CI installs WebKit alongside Chromium (`scripts/e2e.sh`, `make e2e-install`).

**Fidelity caveats:** Playwright WebKit is the engine, not Safari the product —
no ITP 7-day eviction, no Lockdown Mode, no iOS background eviction, and it can
be ahead of shipped Safari. It proves the app survives "no OPFS", which is the
failure that hit iOS users; it cannot prove iOS Safari's *persistent* OPFS path.
Verifying that end-to-end needs a real device/simulator (manual check or a cloud
device farm later, if it earns its keep).

## Follow-ups (deliberately not done here)

- Real-device iOS check of the fix once deployed (open in a normal tab and a
  private tab).
- `navigator.storage.persist()` + Web-Locks-based single-owner election would
  let a *second* tab eventually take over the pool instead of staying in memory
  mode; SQLite ≥ 3.50's `pauseVfs()`/`unpauseVfs()` is built for that handoff.
  Not needed to fix the hang.
