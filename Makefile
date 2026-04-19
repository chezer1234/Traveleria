.PHONY: up down logs migrate seed reset-db shell dev-client e2e e2e-down

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec server npx knex migrate:latest --knexfile src/db/knexfile.js

seed:
	docker compose exec server npx knex seed:run --knexfile src/db/knexfile.js

reset-db:
	docker compose down -v
	docker compose up -d --build

shell:
	docker compose exec server sh

dev-client:
	docker compose stop client 2>/dev/null || true
	cd client && npx vite --host 0.0.0.0 --port 3000

# Run the end-to-end test suite against the prod-build stack.
# APP_SCHEMA_VERSION defaults to the short git SHA so every run is distinguishable in logs.
e2e:
	./scripts/e2e.sh

e2e-down:
	docker compose -f compose.yaml -f compose.prod-build.yaml -f compose.test.yaml down -v
