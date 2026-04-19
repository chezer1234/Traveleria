# CLAUDE.md

Context for AI assistants working on the TravelPoints codebase.

## The Vibe

This app is built around one of the best things humans do: go places. TravelPoints exists because exploring the world — whether it's a weekend ferry to France or a 22-hour odyssey to Papua New Guinea — should feel like an achievement. And it should be scored fairly.

Charlie (15, product owner) and Lewis (dad, technical lead) are building this together. Charlie has strong opinions about what feels right. If Laos scores fewer points than Belgium, something is broken. If the user can't understand *why* a country scores what it does, the transparency isn't there yet.

**Guiding principles for anyone working on this codebase:**

1. **Grounded in real data.** Population figures come from the World Bank. Tourist numbers from UNWTO. Areas from the CIA World Factbook. Coordinates are real capital-city lat/lng. If a number goes into the scoring engine, it should be traceable to a credible source — not vibes.

2. **Transparent to the user.** Every score breakdown explains itself in plain English. No hidden multipliers, no unexplained numbers. A 15-year-old should be able to read the country detail page and understand exactly why Mongolia scores higher than Malta.

3. **Fun but fair.** The system rewards adventurous travel — visiting Turkmenistan should absolutely be worth more than visiting Spain. But it shouldn't be *absurd*. Neighbours with similar travel difficulty shouldn't be 10x apart. The log scaling, caps, and floors exist specifically to keep things competitive without being silly.

4. **Every country matters.** There are 195 countries in this app and each one is somebody's dream trip. Don't treat small nations as rounding errors. The floor of 5 points exists because if you got on a plane, cleared customs, and explored somewhere new — that counts.

---

## Project Overview

TravelPoints is a web app where users log countries they've visited and earn points based on distance, tourism difficulty, and country size. Points increase further by exploring provinces or major cities within each country.

## Tech Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4 + React Router 7 + react-simple-maps
- **Backend:** Node.js + Express + Knex.js (query builder, not ORM)
- **Database:** SQLite via Turso/libSQL (local file for dev/test, Turso cloud for production)
- **Dev environment:** Docker Compose (server + client, SQLite embedded — no external DB)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — runs migrations, seeds, Jest tests, client build

## Running Locally

```bash
docker compose up -d --build    # start everything (uses compose.yaml + compose.override.yaml)
# App at http://localhost:3000 (Vite), API at http://localhost:3001, sqld internal on 8080
docker compose down              # stop everything
make reset-db                    # wipe SQLite DB and re-seed
make e2e                         # full Playwright run against the prod-build stack
```

Ports and versions are locked in — if you find something disagreeing (CLAUDE.md, compose, Vite, nginx, CI, Dockerfiles) it's a bug, fix it.

**Pinned versions** (see `docs/db-speed.md` for rationale):
- Node **24 LTS** — both Dockerfiles and CI
- `ghcr.io/tursodatabase/libsql-server` **v0.24.32**
- `mcr.microsoft.com/playwright` **v1.58.2-noble**
- `nginx` **1.27-alpine**

## Running Tests

```bash
cd server
npx jest __tests__/points.test.js    # unit tests (no DB needed)
npm test                              # all tests (uses local SQLite — no external DB needed)
```

## Key Files

| File | What it does |
|------|-------------|
| `server/src/lib/points.js` | Scoring engine — all formulas, constants, breakdown generation |
| `server/src/db/seeds/01_countries.js` | Country data: population, tourists, area, lat/lng for ~195 countries |
| `server/src/db/seeds/03_provinces.js` | Province data for top 30 countries |
| `server/src/routes/countries.js` | Country API endpoints (includes score breakdown) |
| `server/src/routes/users.js` | User endpoints: travel log, score, city/province visits |
| `server/src/routes/leaderboard.js` | Leaderboard ranking |
| `client/src/pages/CountryDetail.jsx` | Country detail page with score breakdown and province/city toggles |
| `client/src/components/ScoreBreakdown.jsx` | Plain-English score explanation component |
| `client/src/components/ProvinceMap.jsx` | Interactive SVG province map (d3-geo) |
| `client/src/api/client.js` | API client — all fetch calls to the backend |

## Points System

Full docs: [docs/points-system.md](docs/points-system.md)

**Base points** = `distance_multiplier x (tourism_score + size_score)`, floor 5, cap 200.

- Distance: `1 + log2(km / 1000 + 1)` — continuous, from real lat/lng via haversine
- Tourism: `min(20, log2(pop/tourists + 1) x 3)` — capped to prevent single-country dominance
- Size: `log10(area/1000 + 1) x 2`

**Explorer ceiling** = `base x log10(area / regional_value + 1)` — log-scaled to prevent explosion.

Regional values are inversely proportional to average regional population (Asia=10K, Europe=50K, Oceania=273K).

**Tiers:** Top 10 by pop = Tier 1 (provinces), 11-30 = Tier 2 (provinces), rest = Tier 3 (cities), 6 microstates = flat points.

Constants are at the top of `points.js`: `TOURISM_WEIGHT`, `TOURISM_CAP`, `SIZE_WEIGHT`, `FLOOR`, `BASE_CAP`, `EUROPE_ANCHOR`.

### Data Quality

Country data in `01_countries.js` comes from:
- **Population:** World Bank (2020 estimates)
- **Annual tourists:** UNWTO international arrivals data
- **Area:** CIA World Factbook
- **Coordinates:** Capital city lat/lng (standard geographic reference points)

If you're updating or adding data, stick to these sources. Don't estimate tourist numbers — countries with genuinely no data should use conservative figures and get flagged with a comment. The scoring engine handles extremes gracefully (log scaling + caps), but garbage data in means garbage scores out.

## Database Schema

Managed via Knex migrations in `server/src/db/migrations/`. Key tables:

- `countries` (code PK, name, region, population, annual_tourists, area_km2, lat, lng)
- `cities` (id, country_code FK, name, population)
- `provinces` (id, country_code FK, code UNIQUE, name, population, area_km2, disputed)
- `users` (id UUID, username, home_country FK, google_id)
- `user_countries`, `user_cities`, `user_provinces` (visit tracking, cascade on user delete)

Seeds are idempotent — they skip if data exists, but will patch missing fields (e.g. lat/lng on existing rows).

## API Pattern

All points endpoints accept `?home_country=XX` (ISO 3166-1 alpha-2) to personalise scores based on distance from the user's home. The routes resolve the home country code to a full country object (with lat/lng) and pass it to the scoring engine.

The country detail endpoint (`GET /api/countries/:code`) returns a `breakdown` object with human-readable explanations for the score transparency UI.

## How We Build Features

Every feature follows this workflow. Don't skip steps — Charlie (product owner) will want to see the plan before code gets written.

### 1. Branch off main

```bash
git checkout main && git pull
git checkout -b feature/your-feature-name
```

One branch per feature. Name it `feature/descriptive-name`.

### 2. Write a feature doc first

Create `docs/features/your-feature-name.md` before writing any code. This is the plan — not a spec that gathers dust, but a living doc that captures:

- **What** the feature does and why it matters
- **How** it works (data model, formulas, UI behaviour)
- **Open questions** — things to discuss before committing to an approach

### 3. Q&A to flesh it out

Walk through the plan with Charlie. Ask questions, challenge assumptions, run the numbers. The points rebalance started with "Laos scores 3.8, that's wrong" and went through three rounds of "what about this edge case?" before a line of code was written.

Good questions to ask:
- Does this feel right for [specific country/scenario]?
- What happens at the extremes?
- Can a user understand this without reading the code?
- Are there neighbours that would end up wildly different?

### 4. Implement, test, verify in Chrome

Write the code, update tests, then **always test UI changes in the browser** using the Chrome tab tools (`mcp__claude-in-chrome__*`). Read the page, check the actual rendered output matches expectations. Don't assume the frontend looks right from code alone — render it and read it.

### 5. CI green, then PR

Push, wait for CI to pass, create a PR with a clear summary. Link back to the feature doc.

### 6. Update docs after merge

Mark the feature doc status as complete. Update `points-system.md` or other evergreen docs if the feature changes how things work. Keep the feature doc around as history — future you will want to know *why* decisions were made.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/points-system.md](docs/points-system.md) | Evergreen reference for how scoring works |
| [docs/features/province-exploration.md](docs/features/province-exploration.md) | Province/city exploration system |
| [docs/features/world-map.md](docs/features/world-map.md) | World map feature |
| [docs/points-rebalance-plan.md](docs/points-rebalance-plan.md) | Historical analysis behind the April 2026 rebalance |
| [docs/features/turso-migration.md](docs/features/turso-migration.md) | Migration from PostgreSQL to Turso/SQLite |
