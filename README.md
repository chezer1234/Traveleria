# TravelPoints

Track your travels. Earn points. See the world.

## Try it live

### [traveleria.onrender.com](https://traveleria.onrender.com/)

Sign up with a handle (or email) and a password — no email verification, no OAuth. Pick a home country, start logging where you've been, watch your score climb. The app runs local-first in your browser: reads come from a synced SQLite database on your device, so the interface feels instant once the first page has loaded.

Render's free tier lets the API sleep after 15 minutes of idle, so the very first request after a quiet spell takes ~30 seconds to wake it up. Once it's warm, everything is snappy.

## Quick Start

### Prerequisites

You need two things installed:

1. **Git** — https://git-scm.com/download/win (Windows) or `brew install git` (Mac)
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/

That's it. No Node.js, no database installs needed — SQLite is embedded.

### Clone and run

```bash
git clone https://github.com/chezer1234/Traveleria.git
cd Traveleria
make up
```

Wait for it to finish (first time takes a few minutes to download images and install dependencies), then open http://localhost:3000

### Commands — the Makefile is the source of truth

Every command you or CI need lives in the `Makefile`. Run `make help` to see the full list. There should never be any "which docker compose incantation was it?" guessing — if you're reaching for a raw `docker compose ...`, add a target to the Makefile instead.

**Dev stack** (hot reload, Vite + Express + sqld):

| Command | What it does |
|---------|-------------|
| `make up` | Start dev stack |
| `make down` | Stop dev stack |
| `make logs` / `logs-server` / `logs-client` | Tail logs |
| `make ps` | Show container status |
| `make shell` | Open a shell in the server container |
| `make reset-db` | Wipe SQLite volume and re-seed |
| `make test` | Run server Jest tests (no docker) |

**Prod-shape stack** (what CI builds, nginx-served client, same binaries Render runs):

| Command | What it does |
|---------|-------------|
| `make prod-up` | Build + start the prod-shape stack |
| `make prod-down` | Stop it and wipe volumes |
| `make prod-logs` | Tail prod-shape logs |

**End-to-end** (Playwright on host against the prod-shape stack — identical to CI):

| Command | What it does |
|---------|-------------|
| `make e2e-install` | One-time: install Chromium for Playwright |
| `make e2e` | Build prod-shape stack, run the full Playwright suite, tear down |

Windows users need `make` installed (`winget install GnuWin32.Make`); everything else works as-is.

---

## How It Works

Users log countries they've visited and earn **Travel Points** based on how far away each country is, how hard it is to visit, and how big it is. Points increase further by exploring provinces or cities within each country.

### Architecture

```
client/          React 19 + Vite + Tailwind CSS
  src/pages/       Dashboard, CountryDetail, AddCountries, Map, Leaderboard
  src/components/  ProvinceMap, ScoreBreakdown, Layout

server/          Express API + Knex.js
  src/routes/      /countries, /users, /leaderboard
  src/lib/         points.js (scoring engine)
  src/db/          migrations, seeds, connection

compose.yaml         Express + Vite dev server (SQLite embedded)
```

- **SQLite** runs inside the server container (no external database needed)
- **Vite dev server** runs on port 3000 (auto-reloads when you edit client code)
- **Express API** runs on port 3001 (auto-reloads when you edit server code)
- **Production** uses Turso (hosted SQLite) for the database

Edit any file in `server/` or `client/` and the changes appear immediately.

### Points System

Each country's score is built from three factors:

1. **Distance** — how far the country is from your home (continuous, based on real km)
2. **Tourism difficulty** — population vs annual tourists (log-scaled, capped)
3. **Country size** — larger countries score higher (log-scaled)

On top of the base score, users earn **exploration points** by visiting provinces (Tier 1-2 countries) or major cities (Tier 3 countries). Microstates get flat points.

See [docs/points-system.md](docs/points-system.md) for the full formula and examples.

### Database

SQLite (via Turso/libSQL) with Knex.js migrations. Key tables:

| Table | Purpose |
|-------|---------|
| `countries` | ~195 countries with population, tourists, area, lat/lng |
| `cities` | Major cities per country |
| `provinces` | States/provinces for top 30 countries |
| `users` | User accounts with home country |
| `user_countries` | Which countries a user has visited |
| `user_cities` | City visits within countries |
| `user_provinces` | Province visits within countries |

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create/find user |
| GET | `/api/countries` | All countries with baseline points |
| GET | `/api/countries/:code` | Country detail + score breakdown |
| GET | `/api/users/:id/countries` | User's visited countries with points |
| GET | `/api/users/:id/score` | Total Travel Points |
| GET | `/api/leaderboard` | Top 50 users by points |
| POST/DELETE | `/api/users/:id/countries` | Add/remove visited country |
| POST/DELETE | `/api/users/:id/cities` | Add/remove city visit |
| POST/DELETE | `/api/users/:id/provinces` | Add/remove province visit |

All points endpoints accept `?home_country=XX` to personalise scores based on distance.

---

## Running Tests

```bash
make test       # server Jest suite (no docker)
make e2e        # full Playwright suite against the prod-shape stack
```

Single-file run: `cd server && npx jest __tests__/points.test.js`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Points System](docs/points-system.md) | How scores are calculated — formulas, examples, parameters |
| [DB Speed Plan](docs/db-speed.md) | Active roadmap — local-first SQLite-in-the-browser, phased rollout |
| [Province Exploration](docs/features/province-exploration.md) | Province/city exploration system and tier classification |
| [World Map](docs/features/world-map.md) | Interactive map feature |
| [Points Rebalance](docs/points-rebalance-plan.md) | Historical: the analysis and plan behind the April 2026 rebalance |
| [Turso Migration](docs/features/turso-migration.md) | Migration from PostgreSQL to Turso/SQLite |
| [Deployment Guide](docs/deployment.md) | How to deploy to Render + Turso (step-by-step for Charlie) |
