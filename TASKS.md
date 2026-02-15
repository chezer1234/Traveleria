# TravelPoints — Development Task List

> Broken down from [travel-app-spec.md](travel-app-spec.md).
> Each task is a small, self-contained unit of work. Complete them in order within each phase.
> Mark tasks `[x]` as you go.

---

## Phase 1 — Project Setup & Database

> Ref: [Spec Section 6 (Tech Stack)](travel-app-spec.md#6-proposed-tech-stack), [Section 7 (Data Models)](travel-app-spec.md#7-data-models)

### 1.1 Project Initialisation
- [ ] **1.1.1** Initialise Node.js + Express backend (`npm init`, install express, cors, dotenv)
- [ ] **1.1.2** Initialise React frontend with Vite (`npm create vite@latest`) + install TailwindCSS
- [ ] **1.1.3** Set up project folder structure (`/server`, `/client`, shared `.env.example`)
- [ ] **1.1.4** Add basic `package.json` scripts (dev, build, start) for both client and server
- [ ] **1.1.5** Set up `.gitignore` (node_modules, .env, dist)

### 1.2 Database Setup
- [ ] **1.2.1** Install PostgreSQL dependencies (`pg`, `knex` or an ORM like Prisma)
- [ ] **1.2.2** Create database connection config (reads from `.env`)
- [ ] **1.2.3** Write migration: `countries` table — [Spec Section 7: countries](travel-app-spec.md#countries)
  ```
  code (PK), name, region, population, annual_tourists, area_km2
  ```
- [ ] **1.2.4** Write migration: `cities` table — [Spec Section 7: cities](travel-app-spec.md#cities)
  ```
  id (PK), country_code (FK), name, population
  ```
- [ ] **1.2.5** Write migration: `users` table — [Spec Section 7: users](travel-app-spec.md#users)
  ```
  id (PK), username, email, password_hash, avatar_url, home_country (FK), created_at
  ```
- [ ] **1.2.6** Write migration: `user_countries` table — [Spec Section 7: user_countries](travel-app-spec.md#user_countries)
  ```
  id (PK), user_id (FK), country_code (FK), visited_at, created_at, UNIQUE(user_id, country_code)
  ```
- [ ] **1.2.7** Write migration: `user_cities` table — [Spec Section 7: user_cities](travel-app-spec.md#user_cities)
  ```
  id (PK), user_id (FK), city_id (FK), visited_at, created_at, UNIQUE(user_id, city_id)
  ```
- [ ] **1.2.8** Run all migrations and verify tables exist

### 1.3 Seed Data
- [ ] **1.3.1** Create seed file: all ~195 countries with `code`, `name`, `region`, `population`, `annual_tourists`, `area_km2`
- [ ] **1.3.2** Create seed file: major cities (10–30 per country) with `country_code`, `name`, `population`
- [ ] **1.3.3** Run seeds and verify data loads correctly

---

## Phase 2 — Authentication

> Ref: [Spec Section 4.1 (Auth)](travel-app-spec.md#41-authentication), [Section 8 (Auth Endpoints)](travel-app-spec.md#auth)

- [ ] **2.1** Install auth dependencies (bcrypt, jsonwebtoken)
- [ ] **2.2** Create `POST /api/auth/register` — validate input, hash password, insert user, return JWT
  - Must accept `home_country` field — [Spec Section 4.3](travel-app-spec.md#43-travel-points-system)
- [ ] **2.3** Create `POST /api/auth/login` — verify credentials, return JWT
- [ ] **2.4** Create `POST /api/auth/logout` — invalidate token (blacklist or client-side)
- [ ] **2.5** Create auth middleware (`requireAuth`) that verifies JWT on protected routes
- [ ] **2.6** Test all auth endpoints manually or with a basic test file

---

## Phase 3 — Points Calculation Engine

> Ref: [Spec Section 9 (Travel Points Calculation)](travel-app-spec.md#9-travel-points-calculation--finalised-option-e-hybrid)

### 3.1 Regional Multiplier
- [ ] **3.1.1** Define region list (Europe, Asia, North America, South America, Africa, Oceania, Middle East, etc.)
- [ ] **3.1.2** Build region-pair multiplier lookup table — [Spec Section 9.2](travel-app-spec.md#92-step-1--baseline-points)
  ```
  e.g. { "Europe|Europe": 1, "Europe|Oceania": 4, ... }
  ```
- [ ] **3.1.3** Create helper function `getRegionalMultiplier(homeRegion, targetRegion) → number`

### 3.2 Baseline Calculation
- [ ] **3.2.1** Create function `calculateRawBaseline(country, regionalMultiplier) → number` — [Spec Section 9.2](travel-app-spec.md#92-step-1--baseline-points)
  ```
  baseline = (population / annual_tourists) * regionalMultiplier
  ```
- [ ] **3.2.2** Create function `calculateRegionalAverage(region) → number` — mean baseline of countries in normal range (2–500) — [Spec Section 9.3](travel-app-spec.md#93-step-1b--outlier-correction)
- [ ] **3.2.3** Create function `applyOutlierCorrection(rawBaseline, region, areaKm2) → number` — [Spec Section 9.3](travel-app-spec.md#93-step-1b--outlier-correction)
  ```
  if rawBaseline < 2 OR > 500:
      baseline = regionalAvg * log10(areaKm2 / 1000 + 1)
      clamp(baseline, 2, 500)
  ```
- [ ] **3.2.4** Create combined function `getBaseline(country, userHomeCountry) → number`

### 3.3 Exploration Points
- [ ] **3.3.1** Create function `getAreaMultiplier(areaKm2) → number` — [Spec Section 9.4](travel-app-spec.md#94-step-2--total-country-points-exploration-ceiling)
  ```
  max(areaKm2 / 50000, 2)
  ```
- [ ] **3.3.2** Create function `getTotalCountryPoints(baseline, areaKm2) → number`
  ```
  baseline * areaMultiplier
  ```
- [ ] **3.3.3** Create function `getCityPercentage(cityPopulation, countryPopulation) → number` — [Spec Section 9.5](travel-app-spec.md#95-step-3--city-visits--exploration-percentage)
- [ ] **3.3.4** Create function `getCountryExplored(visitedCities, country) → number` (sum of city %, capped at 1.0)

### 3.4 Final Score
- [ ] **3.4.1** Create function `calculateCountryPoints(country, userHomeCountry, visitedCities) → { baseline, explorationPoints, total }` — [Spec Section 9.6](travel-app-spec.md#96-step-4--final-points-per-country)
  ```
  final = baseline + (totalCountryPoints * countryExplored)
  ```
- [ ] **3.4.2** Create function `calculateTotalTravelPoints(user) → number` — sum across all countries — [Spec Section 9.7](travel-app-spec.md#97-users-total-travel-points)
- [ ] **3.4.3** Write unit tests for the points engine (normal countries, outlier-low, outlier-high, edge cases)

---

## Phase 4 — Country & City API Routes

> Ref: [Spec Section 8 (Countries endpoints)](travel-app-spec.md#countries), [Spec Section 4.2 (Country Submission)](travel-app-spec.md#42-country-submission)

- [ ] **4.1** Create `GET /api/countries` — return all countries with personalised baseline points for the logged-in user — [Spec Section 8](travel-app-spec.md#countries)
- [ ] **4.2** Create `GET /api/countries/:code` — return single country detail + list of cities — [Spec Section 8](travel-app-spec.md#countries)
- [ ] **4.3** Create `GET /api/countries/:code/cities` — return all cities for a country with their % contribution — [Spec Section 8](travel-app-spec.md#countries)

---

## Phase 5 — User Travel Log API Routes

> Ref: [Spec Section 8 (User Travel Log endpoints)](travel-app-spec.md#user-travel-log)

- [ ] **5.1** Create `POST /api/users/:id/countries` — add a visited country (with duplicate prevention) — [Spec Section 4.2](travel-app-spec.md#42-country-submission)
- [ ] **5.2** Create `DELETE /api/users/:id/countries/:code` — remove a visited country (+ cascade remove city visits)
- [ ] **5.3** Create `GET /api/users/:id/countries` — return visited countries with points breakdown + % explored
- [ ] **5.4** Create `POST /api/users/:id/cities` — log a city visit (validate city belongs to a visited country)
- [ ] **5.5** Create `DELETE /api/users/:id/cities/:cityId` — remove a city visit
- [ ] **5.6** Create `GET /api/users/:id/score` — return total Travel Points with per-country breakdown — [Spec Section 9.7](travel-app-spec.md#97-users-total-travel-points)

---

## Phase 6 — Frontend: Layout & Auth Pages

> Ref: [Spec Section 10 (Pages & Routes)](travel-app-spec.md#10-pages--routes), [Section 4.1 (Auth)](travel-app-spec.md#41-authentication)

- [ ] **6.1** Set up React Router with all routes from [Spec Section 10](travel-app-spec.md#10-pages--routes)
- [ ] **6.2** Create shared layout component (navbar, footer)
- [ ] **6.3** Create Landing Page (`/`) — app intro + sign up / log in CTA
- [ ] **6.4** Create Register Page (`/register`) — form with username, email, password, **home country selector**
- [ ] **6.5** Create Login Page (`/login`) — form with email + password
- [ ] **6.6** Store JWT in state/localStorage, create auth context for protected routes
- [ ] **6.7** Add route guards — redirect unauthenticated users to `/login`

---

## Phase 7 — Frontend: Dashboard & Country Management

> Ref: [Spec Section 4.2 (Country Submission)](travel-app-spec.md#42-country-submission), [Section 4.3 (Points)](travel-app-spec.md#43-travel-points-system), [Section 4.4 (Profile)](travel-app-spec.md#44-user-profile)

- [ ] **7.1** Create Dashboard Page (`/dashboard`) — display total Travel Points prominently — [Spec Section 4.4](travel-app-spec.md#44-user-profile)
- [ ] **7.2** Show list of visited countries on dashboard with points + % explored per country — [Spec Section 4.3](travel-app-spec.md#43-travel-points-system)
- [ ] **7.3** Create Add Countries Page (`/add-countries`) — search bar with autocomplete — [Spec Section 4.2](travel-app-spec.md#42-country-submission)
- [ ] **7.4** Implement multi-select: add multiple countries in one session
- [ ] **7.5** Add remove country functionality (with confirmation)
- [ ] **7.6** Create city visit UI — within a country, show cities with checkboxes to log visits
- [ ] **7.7** Display per-country % explored bar/indicator
- [ ] **7.8** Ensure points update in real-time when countries/cities are added or removed — [Spec Section 4.3](travel-app-spec.md#43-travel-points-system)

---

## Phase 8 — Frontend: Leaderboard & Public Profiles

> Ref: [Spec Section 4.5 (Leaderboard)](travel-app-spec.md#45-leaderboard), [Section 4.6 (Social)](travel-app-spec.md#46-social--sharing)

- [ ] **8.1** Create `GET /api/leaderboard` backend route — top users by total Travel Points — [Spec Section 8](travel-app-spec.md#leaderboard)
- [ ] **8.2** Create Leaderboard Page (`/leaderboard`) — table with rank, username, total points — [Spec Section 4.5](travel-app-spec.md#45-leaderboard)
- [ ] **8.3** Add pagination (top 50 default view)
- [ ] **8.4** Create Public Profile Page (`/u/:username`) — read-only view of a user's countries + score — [Spec Section 4.6](travel-app-spec.md#46-social--sharing)

---

## Phase 9 — Settings & Polish

> Ref: [Spec Section 5 (Non-Functional)](travel-app-spec.md#5-non-functional-requirements)

- [ ] **9.1** Create Settings Page (`/settings`) — edit username, avatar, home country, change password
- [ ] **9.2** Mobile responsiveness pass — test all pages on small screens — [Spec Section 5](travel-app-spec.md#5-non-functional-requirements)
- [ ] **9.3** Input validation & error handling across all forms and API routes — [Spec Section 5](travel-app-spec.md#5-non-functional-requirements)
- [ ] **9.4** Loading states and empty states for all data-driven pages
- [ ] **9.5** Basic accessibility review (keyboard nav, alt text, contrast) — [Spec Section 5](travel-app-spec.md#5-non-functional-requirements)

---

## Phase 10 — Stretch Goals

> Ref: [Spec Section 4.4](travel-app-spec.md#44-user-profile), [Section 4.6](travel-app-spec.md#46-social--sharing)

- [ ] **10.1** World map visualisation on dashboard highlighting visited countries — [Spec Section 4.4](travel-app-spec.md#44-user-profile)
- [ ] **10.2** Share score card as image or link — [Spec Section 4.6](travel-app-spec.md#46-social--sharing)
- [ ] **10.3** Friend/follow system + friends-only leaderboard — [Spec Section 4.5](travel-app-spec.md#45-leaderboard)
- [ ] **10.4** OAuth via Google — [Spec Section 4.1](travel-app-spec.md#41-authentication)

---

*Generated from [travel-app-spec.md](travel-app-spec.md) on 2026-02-15.*
