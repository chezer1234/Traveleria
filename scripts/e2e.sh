#!/usr/bin/env bash
# Build the prod-image stack and run Playwright against it. Matches what CI runs.
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

COMPOSE=(docker compose -f compose.yaml -f compose.prod-build.yaml -f compose.test.yaml)

cleanup() {
  echo "==> Tearing down stack"
  "${COMPOSE[@]}" down -v --remove-orphans || true
}
trap cleanup EXIT

mkdir -p e2e-report

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d sqld server client

# Let the app server finish migrations/seeds before Playwright probes it.
echo "==> Waiting for API health"
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T server wget -q -O- http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "API up after ${i}s"
    break
  fi
  sleep 1
done

"${COMPOSE[@]}" run --rm e2e
