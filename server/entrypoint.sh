#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -U travelpoints -d travelpoints > /dev/null 2>&1; do
  echo "PostgreSQL not ready yet, retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready!"

echo "Starting server..."
exec node --watch src/index.js
