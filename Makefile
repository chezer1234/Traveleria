.DEFAULT_GOAL := help

# Authoritative list of commands for dev, CI, and prod-shape local verification.
# If you find yourself typing a bare `docker compose ...`, add a target here instead.

# Dev stack = compose.yaml + compose.override.yaml (auto-loaded).
# Prod-shape stack = compose.yaml + compose.prod-build.yaml (explicit).
PROD_COMPOSE := docker compose -f compose.yaml -f compose.prod-build.yaml

.PHONY: help up down restart logs logs-server logs-client ps shell \
        migrate seed reset-db \
        dev-client test server-test client-test check-points-parity \
        prod-up prod-down prod-logs \
        e2e e2e-install \
        clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# -- Dev stack -------------------------------------------------------------
up: ## Start dev stack (Vite + Express + sqld) with hot reload
	docker compose up -d --build

down: ## Stop dev stack
	docker compose down

restart: ## Restart all dev services
	docker compose restart

logs: ## Tail all dev logs
	docker compose logs -f

logs-server: ## Tail server logs only
	docker compose logs -f server

logs-client: ## Tail client (Vite) logs only
	docker compose logs -f client

ps: ## Show dev stack container status
	docker compose ps

shell: ## Open a shell in the server container
	docker compose exec server sh

migrate: ## Run knex migrations against dev DB
	docker compose exec server npx knex migrate:latest --knexfile src/db/knexfile.cjs

seed: ## Re-run knex seeds against dev DB
	docker compose exec server npx knex seed:run --knexfile src/db/knexfile.cjs

reset-db: ## Wipe the dev DB volume and re-seed
	docker compose down -v
	docker compose up -d --build

dev-client: ## Run Vite directly on host (stops the dockerised client first)
	docker compose stop client 2>/dev/null || true
	cd client && npx vite --host 0.0.0.0 --port 3000

# -- Unit tests ------------------------------------------------------------
test: check-points-parity server-test client-test ## Run parity check + server + client unit tests

server-test: ## Run server Jest suite (no docker, uses local SQLite file)
	cd server && npm test

client-test: ## Run client Vitest suite (points parity mirror tests)
	cd client && npx vitest run

# Phase 4 invariant: server/src/lib/points.js and client/src/lib/points.js must
# be byte-identical. The files are kept in sync by `cp server/... client/...`,
# and this target is the enforcement — CI runs it too. If it fails, the last
# person to touch points.js forgot to copy. No normalisation, no shim.
check-points-parity: ## Fail if server/client points.js have drifted
	@diff server/src/lib/points.js client/src/lib/points.js && \
	  echo "  points.js parity: OK" || \
	  (echo "  ERROR: server/src/lib/points.js and client/src/lib/points.js have diverged." >&2; \
	   echo "  Re-copy with: cp server/src/lib/points.js client/src/lib/points.js" >&2; \
	   exit 1)

# -- Prod-shape stack ------------------------------------------------------
# Same binaries and Dockerfiles that CI and Render prod use. Good for manual
# browser verification of OPFS/auth cookie behaviour before pushing.
prod-up: ## Build + start prod-shape stack (nginx-served client, API at :3001)
	APP_SCHEMA_VERSION=$${APP_SCHEMA_VERSION:-$$(git rev-parse --short HEAD 2>/dev/null || echo dev)} \
	  $(PROD_COMPOSE) up -d --build

prod-down: ## Stop prod-shape stack and wipe its volumes
	$(PROD_COMPOSE) down -v --remove-orphans

prod-logs: ## Tail prod-shape logs
	$(PROD_COMPOSE) logs -f

# -- End-to-end ------------------------------------------------------------
# Playwright runs on the host — localhost:3000/3001 is always a secure context
# in Chromium, so OPFS works with no TLS or flags. Auth is bearer-token over
# Authorization header, so cross-origin cookie policy is a non-issue. Stack
# tier shape matches prod (split client + API). See docs/db-speed.md.
e2e: ## Build the prod-shape stack + run Playwright on host (what CI runs)
	./scripts/e2e.sh

e2e-install: ## One-time: install Playwright browsers on this host
	cd e2e && npm install --no-audit --no-fund && npx playwright install --with-deps chromium

# -- Maintenance ------------------------------------------------------------
clean: ## Stop everything + wipe volumes (both dev and prod-shape stacks)
	docker compose down -v --remove-orphans 2>/dev/null || true
	$(PROD_COMPOSE) down -v --remove-orphans 2>/dev/null || true
