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
  echo "==> Tearing down stack"
  # `cd` back in case a test step (e.g. running Playwright from e2e/) changed dir;
  # compose -f paths are relative.
  cd "$REPO_ROOT"
  "${COMPOSE[@]}" down -v --remove-orphans || true
}
trap cleanup EXIT

mkdir -p e2e-report

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d sqld server client

# Let the app server finish migrations/seeds before Playwright probes it.
echo "==> Waiting for API health"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "API up after ${i}s"
    break
  fi
  sleep 1
done

# Install Playwright deps on the host and run the suite. Chromium comes from the
# npm package version pinned in e2e/package.json, so the browser version is
# reproducible across machines even without a container.
cd e2e
npm install --no-audit --no-fund
npx playwright install --with-deps chromium
BASE_URL="${BASE_URL:-http://localhost:3000}" \
API_URL="${API_URL:-http://localhost:3001}" \
  npx playwright test
