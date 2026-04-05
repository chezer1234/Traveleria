.PHONY: up down logs migrate seed reset-db shell dev-client

up:
	docker compose up -d --build

dev-client:
	docker compose stop client 2>/dev/null || true
	cd client && npx vite --host 0.0.0.0 --port 5173

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec server npx knex migrate:latest --knexfile src/db/knexfile.js

seed:
	docker compose exec server npx knex seed:run --knexfile src/db/knexfile.js

reset-db:
	docker compose exec server rm -f /app/data/dev.sqlite3
	docker compose exec server npx knex migrate:latest --knexfile src/db/knexfile.js
	docker compose exec server npx knex seed:run --knexfile src/db/knexfile.js

shell:
	docker compose exec server sh
