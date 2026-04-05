# Feature: Migrate from PostgreSQL to Turso (SQLite)

**Status:** In progress
**Branch:** `feature/turso-migration`
**Date:** 2026-04-05

## Why

Railway credits ran out. We need free hosting. Turso offers a genuinely free tier:
- 9 GB storage, 500 databases
- 500M rows read / 10M rows written per month
- No sleep, no pause, no credit card, no expiry

Combined with Render's free tier (static site + web service), we get zero-cost hosting.

## What changes

Swap PostgreSQL for SQLite everywhere:
- **Local dev/test:** `better-sqlite3` (Knex built-in support, fast, no external DB)
- **Production:** Turso via `@the-forgebase/knex-libsql` (libSQL over HTTP)

Both speak the same SQL dialect, so migrations and queries work identically.

## Migration scope

### 1. Knex config (`knexfile.js`)

| Environment | Before | After |
|-------------|--------|-------|
| development | `pg` + TCP to Docker postgres | `better-sqlite3` + local file `./data/dev.sqlite3` |
| test | `pg` + TCP to Docker postgres | `better-sqlite3` + `:memory:` (fast, disposable) |
| production | `pg` + `DATABASE_URL` | `@the-forgebase/knex-libsql` + `TURSO_DATABASE_URL` |

All environments need `useNullAsDefault: true` and `PRAGMA foreign_keys = ON`.

### 2. Migrations (11 files)

**UUID columns:** Replace `table.uuid('id').defaultTo(knex.fn.uuid())` with `table.text('id').primary()`. App already generates UUIDs via `crypto.randomUUID()`.

**Timestamp defaults:** `knex.fn.now()` works in SQLite (becomes `CURRENT_TIMESTAMP`).

**`.alter()` calls:** Knex's SQLite dialect handles these by recreating the table internally. Two migrations use this (make_email_nullable, make_username_nullable).

**Raw SQL fix:** One line in `20260220001_make_username_nullable.js` uses PG-specific syntax:
```js
// Before (PostgreSQL)
knex.raw("'user_' || left(id::text, 8)")
// After (SQLite)
knex.raw("'user_' || substr(id, 1, 8)")
```

### 3. Seeds (no changes needed)

Already batch inserts at 50 rows (under SQLite's 999 variable limit). No PG-specific patterns.

### 4. Routes

`.returning('*')` is used in 4 places in `users.js`. Knex 3.x supports `.returning()` for SQLite, so no changes needed.

`LOWER()` in `whereRaw` is supported by SQLite.

### 5. Docker

- Remove `postgres` service entirely
- Remove `postgresql-client` from server Dockerfile
- Simplify `entrypoint.sh` (no more waiting for PG)
- Server runs migrations on startup against local SQLite file
- Add volume mount for SQLite data persistence

### 6. CI (`.github/workflows/ci.yml`)

- Remove `postgres` service container
- Remove all `DB_HOST`, `DB_PORT`, etc. env vars
- Tests use in-memory SQLite (faster than PG)
- Add `TURSO_DATABASE_URL` secret for production deploy (later)

### 7. Dependencies

| Remove | Add |
|--------|-----|
| `pg` | `better-sqlite3` |
| | `@the-forgebase/knex-libsql` |

### 8. Makefile

- `make up` still works (Docker, but no postgres)
- `make psql` removed (no postgres)
- `make migrate` / `make seed` still work
- `make reset-db` simplified (just delete SQLite file)

## What doesn't change

- All scoring logic (`points.js`) - pure JS, no DB calls
- Frontend - zero changes
- API contract - identical responses
- Seed data - same files, same format

## Open questions

- **Turso account setup:** Need to create account + database before first production deploy
- **Deploy pipeline:** Render deploy hooks from CI — implement after this PR merges
