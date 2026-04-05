#!/bin/sh
set -e

echo "Running migrations..."
npx knex migrate:latest --knexfile src/db/knexfile.js

echo "Running seeds..."
npx knex seed:run --knexfile src/db/knexfile.js

echo "Starting server..."
exec node --watch src/index.js
