#!/usr/bin/env bash
# Build the prod-image stack and run Playwright against it. Matches what CI runs.
# Playwright runs on the host (not in a compose container) so Chromium talks to
# localhost:3000/3001 — localhost is always a secure context, so OPFS works
# without TLS or flags. Auth is bearer-token in the Authorization header, so
# cross-origin cookie policy is a non-issue. Stack still uses the split client
# + API topology that prod runs.
# The HTML report lands in ./e2e-report (gitignored) so you can open it locally.

set -euo pipefail

cd "$(dirname "$0")/.."

# Timestamped progress marker so the CI console shows which phase is running
# (and how long each takes) instead of a long silent "Run E2E suite" step.
step() { echo "==> [$(date -u +%H:%M:%S)] $*"; }

# Run a command with a wall-clock cap when `timeout` is available (GNU coreutils
# on the CI runner; absent on stock macOS). Prevents a wedged step — e.g. a hung
# `playwright install` apt fetch — from stalling the whole job silently.
guard() { local secs="$1"; shift; if command -v timeout >/dev/null 2>&1; then timeout "$secs" "$@"; else "$@"; fi; }

APP_SCHEMA_VERSION="${APP_SCHEMA_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo dev)}"
export APP_SCHEMA_VERSION

echo "==> Stack schema version: ${APP_SCHEMA_VERSION}"
echo "==> Versions baked into this run:"
node --version 2>/dev/null || true
docker --version
docker compose version

REPO_ROOT="$(pwd)"
COMPOSE=(docker compose -f compose.yaml -f compose.prod-build.yaml)

cleanup() {
  echo "==> Server container logs (last 100 lines):"
  cd "$REPO_ROOT"
  "${COMPOSE[@]}" logs --tail=100 server || true
  echo "==> Tearing down stack"
  "${COMPOSE[@]}" down -v --remove-orphans || true
}
trap cleanup EXIT

mkdir -p e2e-report

step "Building prod-shape images"
"${COMPOSE[@]}" build
step "Starting sqld"
"${COMPOSE[@]}" up -d sqld
# Give sqld a moment to initialise its internal database before the server
# tries to connect and run migrations. The server depends_on sqld (container
# start), but sqld needs a couple of seconds to actually be ready for writes.
sleep 5
step "Starting server + client"
"${COMPOSE[@]}" up -d server client

# Let the app server finish migrations/seeds before Playwright probes it.
step "Waiting for API health"
API_UP=0
for i in $(seq 1 60); do
  if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "API up after ${i}s"
    API_UP=1
    break
  fi
  sleep 1
done
if [ "$API_UP" -eq 0 ]; then
  echo "WARNING: API health check did not pass after 60s — dumping server logs:"
  "${COMPOSE[@]}" logs --tail=50 server || true
fi

# Install Playwright deps on the host and run the suite. Chromium comes from the
# npm package version pinned in e2e/package.json, so the browser version is
# reproducible across machines even without a container.
cd e2e
step "Installing e2e npm deps"
guard 300 npm install --no-audit --no-fund
step "Installing Playwright Chromium + system deps"
guard 420 npx playwright install --with-deps chromium
step "Running Playwright suite"
BASE_URL="${BASE_URL:-http://localhost:3000}" \
API_URL="${API_URL:-http://localhost:3001}" \
  npx playwright test
step "Playwright suite finished"
