# 🌍 TravelPoints — Technical Specification

**Version:** 0.1 (Draft)
**Last Updated:** 2026-02-15
**Status:** In Progress — Travel Points Calculation Finalised (Option E Hybrid)

---

## 1. Overview

**TravelPoints** is a web application that allows users to log countries they've visited and earn "Travel Points" based on those destinations. Users can view their personal score, compare with friends, and track their travel history over time.

---

## 2. Goals & Non-Goals

### Goals
- Allow users to submit countries they've visited
- Automatically calculate and display a running Travel Points total
- Let users view their own profile and compare scores with others
- Provide a simple, mobile-friendly web interface

### Non-Goals (for v1)
- Native mobile app (web-responsive only)
- Real-time multiplayer / live race tracking
- Travel itinerary planning or booking integration
- Monetisation / premium tiers

---

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Visitor | Register an account | I can save my travel history |
| US-02 | User | Search and select countries I've visited | My list stays accurate |
| US-03 | User | See my total Travel Points | I know my current score |
| US-04 | User | View a breakdown of points per country | I understand how my score is calculated |
| US-05 | User | Share my profile or score | Friends can see my progress |
| US-06 | User | View a leaderboard of friends/all users | I can compare myself to others |
| US-07 | Admin | Define or update points per country | Point values can be adjusted over time |

---

## 4. Functional Requirements

### 4.1 Authentication
- Email/password registration and login
- Optional: OAuth via Google
- Password reset via email
- Session management (JWT or cookie-based)

### 4.2 Country Submission
- Search bar with autocomplete for all ~195 UN-recognised countries
- Multi-select: users can add multiple countries in one session
- Duplicate prevention (can't add same country twice)
- Ability to remove a previously logged country
- Timestamp stored for each submission (date visited can be optional)

### 4.3 Travel Points System
- Each country has a **baseline** calculated from population, tourism data, and regional distance (see Section 9)
- Users set their **home country** during registration (used for regional multiplier)
- Visiting a country earns the baseline points immediately
- Users log **cities visited** within each country to earn exploration points
- Each city contributes a **percentage** of that country explored (calculated dynamically from city population / country population)
- Users can view their **% explored** per country
- Total country points = baseline + (total_country_points * % explored)
- User's total score = sum of points across all visited countries
- Points recalculate automatically when countries/cities are added/removed
- Points displayed on profile and leaderboard

### 4.4 User Profile
- Display name, avatar (optional upload)
- Total Travel Points (prominent)
- List of visited countries with individual point values
- World map visualisation highlighting visited countries (stretch goal)

### 4.5 Leaderboard
- Global leaderboard ranked by Travel Points
- Friends-only leaderboard (requires friend/follow system)
- Pagination (top 50 default view)

### 4.6 Social / Sharing
- Public profile URL (`/u/username`)
- Share score card as image or link (stretch goal)
- Friend/follow system (stretch goal for v1)

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Page load < 2s on standard broadband |
| Scalability | Should support up to 10,000 users initially |
| Accessibility | WCAG 2.1 AA compliance |
| Responsiveness | Fully functional on mobile, tablet, and desktop |
| Security | HTTPS only; passwords hashed (bcrypt); input sanitised |
| Uptime | 99.5% target |

---

## 6. Proposed Tech Stack

> These are recommendations — adjust to your preference.

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) + TailwindCSS |
| Routing | React Router v6 |
| State Management | Zustand or React Context |
| Backend | Node.js + Express (REST API) or Next.js (full-stack) |
| Database | PostgreSQL (via Supabase or Railway) |
| Auth | Supabase Auth or Auth.js |
| Hosting | Vercel (frontend) + Railway/Supabase (backend/DB) |
| Map Visualisation | react-simple-maps or Leaflet.js |

---

## 7. Data Models

### `users`
```sql
id            UUID PRIMARY KEY
username      VARCHAR(50) UNIQUE NOT NULL
email         VARCHAR(255) UNIQUE NOT NULL
password_hash TEXT
avatar_url    TEXT
home_country  CHAR(2) REFERENCES countries(code)  -- user's home country (for regional multiplier)
created_at    TIMESTAMP DEFAULT NOW()
```

### `countries`
```sql
code          CHAR(2) PRIMARY KEY         -- ISO 3166-1 alpha-2
name          VARCHAR(100) NOT NULL
region        VARCHAR(50) NOT NULL        -- e.g. "Europe", "Asia", "North America"
population    BIGINT NOT NULL             -- country population
annual_tourists BIGINT NOT NULL           -- annual tourist arrivals
area_km2      INTEGER NOT NULL            -- country area in km²
```
> **Note:** `base_points` is no longer a static column — it is calculated per-user based on their home country's regional multiplier.

### `cities`
```sql
id            UUID PRIMARY KEY
country_code  CHAR(2) REFERENCES countries(code)
name          VARCHAR(150) NOT NULL
population    BIGINT NOT NULL             -- city population (used to calculate % contribution)
```
> **City % contribution** = `city.population / country.population` (calculated dynamically).

### `user_countries`
```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users(id)
country_code  CHAR(2) REFERENCES countries(code)
visited_at    DATE                        -- optional, user-supplied
created_at    TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, country_code)
```

### `user_cities`
```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users(id)
city_id       UUID REFERENCES cities(id)
visited_at    DATE                        -- optional, user-supplied
created_at    TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, city_id)
```

---

## 8. API Endpoints (REST)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Authenticate user, return token |
| POST | `/api/auth/logout` | Invalidate session |

### Countries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/countries` | List all countries with point values (personalised to user's home country) |
| GET | `/api/countries/:code` | Get single country detail including cities |
| GET | `/api/countries/:code/cities` | List all cities in a country with % contribution |

### User Travel Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id/countries` | Get user's visited countries + points + % explored |
| POST | `/api/users/:id/countries` | Add a visited country (earns baseline points) |
| DELETE | `/api/users/:id/countries/:code` | Remove a visited country |
| POST | `/api/users/:id/cities` | Log a city visit (increases % explored) |
| DELETE | `/api/users/:id/cities/:cityId` | Remove a city visit |
| GET | `/api/users/:id/score` | Get user's total Travel Points (breakdown included) |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get top users by Travel Points |

---

## 9. Travel Points Calculation — Finalised (Option E Hybrid)

> **Decision: Hybrid formula with outlier correction.**
> Agreed 2026-02-15.

### 9.1 Overview

Points are **personalised per user** (because the regional multiplier depends on the user's home country). A user earns points in two stages:

1. **Baseline points** — earned immediately upon logging a country visit
2. **Exploration points** — earned by logging individual city visits within that country

### 9.2 Step 1 — Baseline Points

```
baseline = (country.population / country.annual_tourists) * regional_multiplier
```

**Regional multiplier** depends on the distance between the user's home region and the visited country's region:

| Distance tier | Example (home: Europe) | Multiplier |
|---|---|---|
| Same region | Europe → Europe | x1 |
| Adjacent region | Europe → North Africa / Middle East | x1.5 |
| Moderate distance | Europe → East Asia / Sub-Saharan Africa | x2.5 |
| Far | Europe → North America / South America | x3 |
| Opposite side | Europe → Oceania / Pacific Islands | x4 |

> Regional multiplier tiers are defined as a lookup table per region pair (see implementation).

### 9.3 Step 1b — Outlier Correction

If the raw baseline falls **below 2** or **above 500**, it is discarded and replaced with an area-based alternative anchored to the regional average:

```
if baseline < 2 OR baseline > 500:
    baseline = regional_avg_baseline * log10(area_km² / 1000 + 1)
    baseline = clamp(baseline, 2, 500)
```

Where `regional_avg_baseline` is the mean baseline of all countries in the **same region** whose raw baselines fall within the normal 2–500 range.

**Why:** This prevents extreme values caused by the population/tourist ratio:
- Popular small countries (e.g. Iceland: 0.2 raw) get pulled **up** toward their regional average
- Isolated countries with minimal tourism (e.g. North Korea: 5,200 raw) get pulled **down** toward their regional average
- The `log10(area)` factor ensures larger countries within the outlier group still score higher than tiny ones

### 9.4 Step 2 — Total Country Points (Exploration Ceiling)

The maximum additional points available from exploring within a country:

```
area_multiplier = max(area_km² / 50,000, 2)
total_country_points = baseline * area_multiplier
```

| Example country | area_km² | area_multiplier | If baseline=30 → total |
|---|---|---|---|
| Vatican City | 0.44 | 2 (floor) | 60 |
| Iceland | 103,000 | 2.06 | 61.8 |
| France | 640,000 | 12.8 | 384 |
| USA | 9,834,000 | 196.7 | 5,901 |
| Russia | 17,098,000 | 341.9 | 10,258 |

### 9.5 Step 3 — City Visits & Exploration Percentage

Users log cities they've visited within a country. Each city contributes a **percentage** of that country explored:

```
city_percentage = city.population / country.population
country_explored = sum of city_percentage for all visited cities in that country
country_explored = min(country_explored, 1.0)   -- cap at 100%
```

> Example: Visiting Paris (2.1M) in France (67M) → 2.1M / 67M = **3.1%** of France explored.
> Visiting Paris + Lyon + Marseille + Toulouse → cumulative % toward France.

### 9.6 Step 4 — Final Points Per Country

```
final_points = baseline + (total_country_points * country_explored)
```

| Component | What it rewards |
|---|---|
| `baseline` | Simply visiting the country (entry-level reward) |
| `total_country_points * country_explored` | Deeper exploration within the country |

**Worked example — France (user home: UK):**
| Step | Calculation | Value |
|---|---|---|
| Raw baseline | (67,000,000 / 90,000,000) * 1.0 | 0.74 |
| Outlier? | 0.74 < 2 → **yes**, apply correction | — |
| Regional avg (Europe, normal range) | ~25 (example) | 25 |
| Corrected baseline | 25 * log10(640,000 / 1,000 + 1) = 25 * 2.81 | **70.2** |
| Clamp | 2 ≤ 70.2 ≤ 500 → OK | **70.2** |
| Area multiplier | max(640,000 / 50,000, 2) | 12.8 |
| Total country points | 70.2 * 12.8 | 898.6 |
| Cities visited | Paris + Lyon + Marseille → 6.2% | 0.062 |
| Exploration points | 898.6 * 0.062 | 55.7 |
| **Final points** | **70.2 + 55.7** | **125.9** |

### 9.7 User's Total Travel Points

```
total_travel_points = SUM(final_points) across all visited countries
```

---

## 10. Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | App intro, sign up / log in CTA |
| `/register` | Register | Create account form |
| `/login` | Login | Login form |
| `/dashboard` | Dashboard | User's score, visited countries, quick-add |
| `/add-countries` | Add Countries | Search & select countries |
| `/leaderboard` | Leaderboard | Global rankings table |
| `/u/:username` | Public Profile | Shareable profile view |
| `/settings` | Settings | Edit profile, change password |

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the Travel Points calculation formula? | Product | ✅ Resolved — Option E Hybrid with outlier correction (see Section 9) |
| 2 | Is there a "date visited" requirement or optional? | Product | ⚠️ Open |
| 3 | Should the leaderboard be global-only, or friends-first? | Product | ⚠️ Open |
| 4 | Do we need a mobile-native app in v2? | Product | ⚠️ Open |
| 5 | What's the MVP cut-off — which features ship in v1? | Product | ⚠️ Open |

---

## 12. Milestones (Suggested)

| Phase | Deliverable | Est. Duration |
|-------|-------------|---------------|
| Phase 1 | Auth + DB setup + country data seeded | 1 week |
| Phase 2 | Add/remove countries + points engine | 1 week |
| Phase 3 | User profile + dashboard UI | 1 week |
| Phase 4 | Leaderboard + public profiles | 1 week |
| Phase 5 | Polish, testing, deployment | 1 week |

---

*This document is a living spec. Update it as decisions are made, especially Section 9 (Points Calculation).*
