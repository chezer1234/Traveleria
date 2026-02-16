[travel-app-spec.md](https://github.com/user-attachments/files/25339115/travel-app-spec.md)
# 🌍 TravelPoints — Technical Specification

**Version:** 0.1 (Draft)
**Last Updated:** 2026-02-15
**Status:** In Progress — Travel Points Calculation TBD

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
- Each country has a base Travel Points value (calculation logic TBD — see Section 9)
- User's total score = sum of points for all submitted countries
- Points recalculate automatically when countries are added/removed
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
created_at    TIMESTAMP DEFAULT NOW()
```

### `countries`
```sql
code          CHAR(2) PRIMARY KEY   -- ISO 3166-1 alpha-2
name          VARCHAR(100) NOT NULL
base_points   INTEGER NOT NULL      -- TBD: calculation logic
region        VARCHAR(50)           -- e.g. "Europe", "Asia"
```

### `user_countries`
```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users(id)
country_code  CHAR(2) REFERENCES countries(code)
visited_at    DATE                  -- optional, user-supplied
created_at    TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, country_code)
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
| GET | `/api/countries` | List all countries with point values |
| GET | `/api/countries/:code` | Get single country detail |

### User Travel Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id/countries` | Get user's visited countries + points |
| POST | `/api/users/:id/countries` | Add a visited country |
| DELETE | `/api/users/:id/countries/:code` | Remove a visited country |
| GET | `/api/users/:id/score` | Get user's total Travel Points |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get top users by Travel Points |

---

## 9. Travel Points Calculation ⚠️ TBD

> **This section is intentionally left open for discussion.**
> 
> Below are possible approaches — the final method is to be agreed upon.

### Option A — Flat Points
Every country is worth the same fixed number of points (e.g. 100 pts each).
- Simple, fair, easy to explain.

### Option B — Distance-Based
Points awarded based on how far the country is from the user's home country.
- Rewards adventurous/long-haul travel.
- Requires knowing user's home country.

### Option C — Rarity / Popularity-Based
Countries visited less frequently by all users earn more points.
- Dynamic — values shift as the user base grows.
- More complex to implement and explain.

### Option D — Regional Diversity Bonus
Bonus multiplier when the user has visited countries across multiple continents/regions.
- Encourages breadth of travel, not just volume.

### Option E — Hybrid (Recommended starting point)
`Travel Points = base_points + (distance_bonus) + (diversity_bonus)`

**➡ Next step:** Agree on the points formula before development begins. This will determine the `base_points` column values in the `countries` table and any bonus logic in the scoring service.

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
| 1 | What is the Travel Points calculation formula? | Product | ⚠️ Open |
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
