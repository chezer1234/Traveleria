# TravelPoints

Track your travels. Earn points. See the world.

## Quick Start

### Prerequisites

You need two things installed:

1. **Git** — https://git-scm.com/download/win (Windows) or `brew install git` (Mac)
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/

That's it. No Node.js, no PostgreSQL, no other installs needed.

### Clone and run

```bash
git clone https://github.com/chezer1234/Traveleria.git
cd Traveleria
docker compose up -d --build
```

Wait for it to finish (first time takes a few minutes to download images and install dependencies), then open http://localhost:5173

### Useful commands

| Command | What it does |
|---------|-------------|
| `docker compose up -d --build` | Start everything |
| `docker compose down` | Stop everything |
| `docker compose logs -f` | Watch live logs |
| `docker compose logs -f server` | Watch server logs only |
| `docker compose restart server` | Restart the backend |
| `docker compose down -v` | Stop and wipe database (fresh start) |

If you have `make` installed (Mac has it, Windows: `winget install GnuWin32.Make`):

| Command | What it does |
|---------|-------------|
| `make up` | Start everything |
| `make down` | Stop everything |
| `make logs` | Watch live logs |
| `make reset-db` | Wipe database and restart fresh |
| `make psql` | Open a database shell |

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

docker-compose.yml   PostgreSQL + Express + Vite dev server
```

- **PostgreSQL** runs in Docker on port 5432 (data persists between restarts)
- **Express API** runs on port 3000 (auto-reloads when you edit server code)
- **Vite dev server** runs on port 5173 (auto-reloads when you edit client code)

Edit any file in `server/` or `client/` and the changes appear immediately.

### Points System

Each country's score is built from three factors:

1. **Distance** — how far the country is from your home (continuous, based on real km)
2. **Tourism difficulty** — population vs annual tourists (log-scaled, capped)
3. **Country size** — larger countries score higher (log-scaled)

On top of the base score, users earn **exploration points** by visiting provinces (Tier 1-2 countries) or major cities (Tier 3 countries). Microstates get flat points.

See [docs/points-system.md](docs/points-system.md) for the full formula and examples.

### Database

PostgreSQL with Knex.js migrations. Key tables:

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
# Unit tests (no database needed)
cd server && npx jest __tests__/points.test.js

# All tests (needs PostgreSQL — run via Docker or CI)
cd server && npm test
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Points System](docs/points-system.md) | How scores are calculated — formulas, examples, parameters |
| [Province Exploration](docs/features/province-exploration.md) | Province/city exploration system and tier classification |
| [World Map](docs/features/world-map.md) | Interactive map feature |
| [Points Rebalance](docs/points-rebalance-plan.md) | Historical: the analysis and plan behind the April 2026 rebalance |
