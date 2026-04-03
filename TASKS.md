# TravelPoints — Rescue Plan

> **Goal:** Get this app running locally with `make up` and deployed with a single merge to `main`.
> **Audience:** A 15-year-old dev (Charlie), his dad (Lewis), and Claude agents.
> **Principle:** Simplest thing that works. No gold-plating. Ship it, then iterate.

---

## Progress Checklist

### Phase 0 — Docker & Local Dev
- [x] `docker-compose.yml` with PostgreSQL, server, client services
- [x] `server/Dockerfile` with Node 20, file watching
- [x] `client/Dockerfile` with Vite dev server
- [x] `Makefile` with up/down/logs/migrate/seed/reset-db/shell/psql
- [x] `.env` with working defaults (no manual setup needed)
- [x] `server/entrypoint.sh` — wait for PG, migrate, seed, start
- [x] Verify: `make up` → app at http://localhost:5173
- [x] Idempotent seeds (don't wipe user data on restart)
- [x] Persistent PostgreSQL volume (data survives restarts, `make reset-db` to wipe)

### Phase 1 — Fix Authentication
- [x] Remove JWT, bcrypt, passport dependencies and code
- [x] Add `POST /api/users` — create or find user by username + home_country
- [x] Add `GET /api/users/:id` — get user profile
- [x] Frontend welcome screen: name + country → creates user
- [x] AuthContext stores user in localStorage, exposes user/logout
- [x] Update API client to use user ID from context (no JWT headers)
- [x] Verify: open app → enter name → land on dashboard → refresh → still logged in

### Phase 2 — Fix Core Loop
- [x] Dashboard shows real points and visited countries
- [x] Add Countries page works with real user ID
- [x] Country Detail page: city checkboxes work, exploration % updates
- [x] Navigation: Dashboard / Add Countries / Leaderboard / username / logout
- [x] Empty states and loading states
- [x] Verify: full loop — welcome → add countries → explore cities → dashboard updates

### Phase 3 — Leaderboard
- [x] `GET /api/leaderboard` endpoint — top 50 by points
- [x] Leaderboard page with rank, username, flag, points, countries count
- [x] Current user highlighted, shows rank if outside top 50
- [x] Verify: create 2+ users → see them ranked

### Phase 4 — Polish
- [x] User-friendly error messages
- [x] Number formatting (1,234 pts), flag emojis
- [x] Mobile responsiveness pass
- [x] No console errors, no broken states

### Phase 5 — Production Deployment
- [x] Express serves built React in production mode
- [ ] Railway/Render project with PostgreSQL (needs account setup)
- [x] GitHub Actions CI workflow: build, test, smoke test on push to main/PR
- [x] railway.json config for build/deploy
- [ ] Connect Railway to GitHub repo (enable "Wait for CI")
- [ ] Seed production database
- [ ] Verify deployment via `gh` CLI (check workflow run status)

### Phase 6 — Browser Testing (completed during development)
- [x] Smoke test via Chrome: welcome flow works
- [x] Smoke test via Chrome: add countries + cities flow
- [x] Smoke test via Chrome: leaderboard shows data
- [x] Smoke test via Chrome: mobile viewport check

---

## Current State

The app has solid bones but doesn't run:
- Express API with routes for countries, users, cities, and a good points engine
- React + Vite + Tailwind frontend with dashboard, add-countries, and country-detail pages
- PostgreSQL schema with migrations and seed data (195 countries + cities)
- **BUT**: No Docker/local dev setup, fake auth (random UUIDs), frontend and backend auth don't match, no way to create a user through the UI

## Architecture Decisions

### Keep
- **React + Vite + TailwindCSS** frontend — already built, works
- **Express + Knex** backend — already built, works
- **PostgreSQL** — right choice for relational data
- **Points calculation engine** (`server/src/lib/points.js`) — genuinely good, don't touch it
- **Seed data** — 195 countries and cities, already done

### Remove
- **JWT authentication** — overkill for MVP, adds complexity
- **bcrypt / password hashing** — no passwords needed yet
- **Passport.js / Google OAuth** — half-implemented, adds 3 dependencies for zero value
- **Auth middleware** (`requireAuth`) — not needed without JWT

### Add
- **Docker Compose** — PostgreSQL + backend + frontend, one command
- **Makefile** — `make up`, `make down`, `make migrate`, `make seed`, `make logs`
- **Simple auth flow** — "What's your name?" + "Where are you from?" → creates user, stores ID in localStorage
- **Leaderboard** — the fun social feature that makes people care

### Change
- **Auth model** — Replace JWT session with simple "pick a username" flow. Store user ID in localStorage. No passwords.
- **CORS** — Lock down to known origins instead of `origin: true`
- **API client** — Use Vite proxy in dev (already configured), relative URLs

---

## Phase 0 — Docker & Local Dev Setup
> **Goal:** Anyone can clone and run the app with one command on any OS.

### 0.1 Create `docker-compose.yml`
- **PostgreSQL** service: port 5432, volume for data persistence, healthcheck
- **Server** service: Node.js, port 3000, depends on postgres, auto-runs migrations + seeds on startup
- **Client** service: Vite dev server, port 5173, depends on server

### 0.2 Create Dockerfiles
- `server/Dockerfile` — Node 20 alpine, install deps, run dev server with file watching (nodemon or node --watch)
- `client/Dockerfile` — Node 20 alpine, install deps, run `vite --host` (needed for Docker networking)

### 0.3 Create `Makefile`
```
make up        — docker compose up -d --build
make down      — docker compose down
make logs      — docker compose logs -f
make migrate   — run knex migrations inside server container
make seed      — run knex seeds inside server container
make reset-db  — drop and recreate database, run migrations + seeds
make shell     — open a bash shell in the server container
make psql      — connect to the database
```

### 0.4 Create `.env` from `.env.example` defaults
- All defaults should work out of the box (no manual env setup needed)
- Docker compose should pass env vars to services

### 0.5 Create `server/entrypoint.sh`
- Wait for PostgreSQL to be ready
- Run migrations
- Run seeds (idempotent — skip if data exists)
- Start the dev server

**Acceptance:** `git clone && make up` → app running at http://localhost:5173

---

## Phase 1 — Fix Authentication
> **Goal:** A user can enter their name and home country and start using the app. No passwords.

### 1.1 Simplify the backend auth
- Remove `passport`, `passport-google-oauth20`, `jsonwebtoken`, `bcrypt` from dependencies
- Remove `server/src/config/passport.js`
- Remove `server/src/middleware/auth.js` (the JWT middleware)
- Remove auth routes (`/api/auth/*`) — we don't need register/login/logout

### 1.2 Add simple user creation endpoint
- `POST /api/users` — accepts `{ username, home_country }`, returns created user
  - If username already exists, return the existing user (this is the "login")
  - Validate: username required (3-30 chars, alphanumeric + underscores), home_country must be valid country code
- `GET /api/users/:id` — get user profile

### 1.3 Update the frontend auth flow
- On first visit, show a welcome screen: "What's your name?" + "Where are you from?" (country dropdown)
- On submit, call `POST /api/users` → store returned user object in localStorage
- `AuthContext` should expose `{ user, setUser, logout }` where user has `{ id, username, home_country }`
- "Logout" = clear localStorage, show welcome screen again
- If localStorage has a user, skip the welcome screen

### 1.4 Update API client
- All API calls that need user context should read user ID from AuthContext
- Remove any JWT token headers
- Use relative URLs (Vite proxy handles `/api` → backend)

### 1.5 Update the users routes
- Remove `requireAuth` middleware from all routes
- User ID comes from the URL param (e.g., `/api/users/:id/countries`)
- The frontend ensures it only calls routes for the logged-in user's ID

**Acceptance:** Open app → enter name + country → land on dashboard → refresh page → still logged in

---

## Phase 2 — Fix the Dashboard & Core Loop
> **Goal:** The main loop works: add countries → see points → explore cities → see points update.

### 2.1 Fix Dashboard page
- Fetch user's visited countries and score using the real user ID from auth context
- Display total Travel Points prominently
- List visited countries with points per country
- "Add Countries" button links to `/add-countries`
- Handle empty state: "You haven't visited any countries yet!"

### 2.2 Fix Add Countries page
- Fetch all countries from `/api/countries?home_country=XX`
- Search/filter works
- Clicking a country adds it via `POST /api/users/:id/countries`
- Already-visited countries are visually marked and can't be re-added
- After adding, user can go back to dashboard or continue adding

### 2.3 Fix Country Detail page
- Show country info + baseline points
- List cities with checkboxes
- Checking a city calls `POST /api/users/:id/cities`
- Unchecking calls `DELETE /api/users/:id/cities/:cityId`
- Show exploration percentage updating in real-time
- Show how many points this country is worth with current exploration

### 2.4 Fix the navigation
- Nav should show: Dashboard, Add Countries, Leaderboard (placeholder), username
- "Logout" option in nav (clears session, returns to welcome screen)
- Mobile hamburger menu should work

**Acceptance:** Full loop works: welcome → add countries → drill into country → check cities → dashboard shows updated points

---

## Phase 3 — Leaderboard
> **Goal:** Users can see how they rank against others. This is the social hook.

### 3.1 Create leaderboard API endpoint
- `GET /api/leaderboard` — returns top 50 users ranked by total Travel Points
- Each entry: `{ rank, username, home_country, total_points, countries_visited_count }`
- Points calculation should use each user's own home_country for their personalised scores

### 3.2 Create Leaderboard page
- Table: Rank, Username, Home Country (flag emoji), Points, Countries Visited
- Highlight the current user's row
- If user not in top 50, show their rank at the bottom: "You are #73"

### 3.3 Wire up navigation
- Leaderboard link in nav bar works
- Route: `/leaderboard`

**Acceptance:** Multiple users can sign up and see themselves ranked on the leaderboard

---

## Phase 4 — Polish & Bug Fixes
> **Goal:** The app feels finished enough to show friends.

### 4.1 Error handling
- API errors show user-friendly messages (not raw JSON)
- Network errors show "Something went wrong, try again"
- Loading spinners on data fetches

### 4.2 Visual polish
- Consistent spacing, colours, typography
- Points displayed with proper formatting (e.g., "1,234 pts")
- Country flags where possible (emoji flags from country codes)
- Empty states have helpful messaging

### 4.3 Mobile responsiveness check
- All pages usable on a phone-width screen
- Tables scroll horizontally if needed
- Touch targets are large enough

### 4.4 Data integrity
- Seed script is idempotent (can run multiple times safely)
- Removing a country cascades to remove its city visits
- Duplicate country/city additions are handled gracefully

**Acceptance:** App looks good on phone and desktop, no console errors, no broken states

---

## Phase 5 — Production Deployment
> **Goal:** The app is live on the internet, auto-deploys from `main`.

### 5.1 Choose and set up hosting
- **Recommended: Railway** — free tier, deploys from GitHub, has managed PostgreSQL
- Alternative: Render (also free tier, also deploys from GitHub)
- Create a Railway project with two services: web (Express serving built React) + PostgreSQL

### 5.2 Production build setup
- Backend serves the built React frontend in production (`express.static`)
- Add `client/dist` to Express static middleware when `NODE_ENV=production`
- Build script: `cd client && npm run build`
- Single `Procfile` or `railway.json` that builds + starts

### 5.3 Production configuration
- `DATABASE_URL` env var (provided by Railway)
- `NODE_ENV=production`
- Auto-run migrations on deploy (but NOT seeds in prod — seed once manually)
- CORS set to production domain

### 5.4 CI/CD with GitHub Actions
- GitHub Actions workflow (`.github/workflows/deploy.yml`):
  - Trigger: push to `main`
  - Steps: install deps → build client → run tests → deploy to Railway
  - Railway deploy via `railway up` CLI or Railway GitHub integration
- Add `RAILWAY_TOKEN` to GitHub repo secrets
- Workflow should report status clearly so we can verify with `gh run list` and `gh run view`

### 5.5 Seed production database
- Run seed script once against production DB
- Verify all 195 countries + cities loaded

### 5.6 Verify CI/CD pipeline
- After first deploy, run `gh run list --workflow=deploy.yml` to check status
- Run `gh run view <id>` to confirm steps passed
- Verify the deployed app loads in browser

**Acceptance:** Push to `main` → GitHub Actions runs → deploys to Railway → app live → `gh run list` shows green

---

## Phase 6 — Browser Smoke Tests
> **Goal:** Verify the app actually works end-to-end by driving Chrome.

### 6.1 Welcome flow
- Open http://localhost:5173
- Verify welcome screen appears
- Enter username and select home country
- Submit and verify dashboard loads

### 6.2 Add countries flow
- Navigate to Add Countries
- Search for a country and add it
- Verify it appears in the list / dashboard

### 6.3 City exploration flow
- Click into a visited country
- Check some city checkboxes
- Verify exploration percentage updates
- Return to dashboard, verify points changed

### 6.4 Leaderboard
- Navigate to leaderboard
- Verify current user appears with correct points

### 6.5 Mobile viewport
- Resize to mobile width (375px)
- Verify layout doesn't break, nav works

**Acceptance:** All smoke tests pass via Chrome automation

---

## Open Questions / Ambiguities

> These need discussion before or during implementation. Agents should flag these rather than guessing.

| # | Question | Context | Suggested Default |
|---|----------|---------|-------------------|
| 1 | **Username uniqueness as auth — is this OK?** | No passwords means anyone could type someone else's username and "become" them. Fine for friends, bad for internet strangers. | For MVP: yes, keep it simple. Add a simple PIN or password in v2 if needed. |
| 2 | **Should we keep the JWT/password auth code or delete it?** | It's unused but represents work Charlie did. Deleting is cleaner. | Delete it. It's in git history if we ever want it back. |
| 3 | **Home country required or optional?** | Points are personalised by home country (distance-based multipliers). Without it, we can't calculate properly. | Required. Ask on signup. Allow changing later. |
| 4 | **What domain/name for production?** | Need to decide URL for Railway/Render deployment. | Use whatever Railway gives us for now. Custom domain later. |
| 5 | **Should the leaderboard recalculate all scores on every request?** | Currently scores are calculated on-the-fly. With many users this gets slow. | Fine for <100 users. Cache/materialise later if needed. |
| 6 | **Keep cities feature or defer?** | Cities add exploration depth but also complexity. The core loop works without them. | Keep — it's already built and it's the unique part of the app. |

---

## Agent Execution Guide

> How to use Claude agents to get this done efficiently.

### Recommended workflow
1. **Phase 0** — Single agent: Create Docker setup, Makefile, entrypoint script. Test with `make up`.
2. **Phase 1** — Single agent: Strip auth, add simple user flow. Test end-to-end.
3. **Phase 2** — Single agent: Fix frontend pages to work with new auth. Test the full loop.
4. **Phase 3** — Single agent: Add leaderboard backend + frontend. Test with multiple users.
5. **Phase 4** — Single agent: Polish pass. Visual review.
6. **Phase 5** — Pair with human: Deployment needs account setup (Railway/Render) which requires human interaction.

### Each agent should
- Read this plan first
- Read the relevant existing code before changing it
- Make a single PR per phase (or per sub-phase if the diff is large)
- Test their changes work by running `make up` and hitting the app
- Not modify files outside their phase's scope

---

*This plan replaces the previous TASKS.md. The old task list is in git history if needed.*
*Written 2026-04-03 by Claude (chief tech lizard) for Charlie and Lewis.*
