.PHONY: up down logs migrate seed reset-db shell psql

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

psql:
	docker compose exec postgres psql -U travelpoints -d travelpoints
