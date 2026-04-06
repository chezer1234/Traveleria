# Deployment Guide

How to get TravelPoints live on the internet for free.

**Stack:** Render (frontend + backend hosting) + Turso (database)
**Cost:** $0/month
**Deploy trigger:** Push to `main` after CI passes

---

## 1. Create a Turso database

Turso is a hosted SQLite database. Free tier: 9 GB storage, 500M row reads/month, no sleep.

### Sign up

1. Go to https://turso.tech and click **Get Started**
2. Sign in with your **GitHub account** (the `chezer1234` one)
3. You'll land on the Turso dashboard

### Create the database

You can do this from the dashboard UI, or with the CLI:

**Option A: Dashboard (easiest)**
1. Click **Create Database**
2. Name it `travelpoints`
3. Pick the closest region (e.g. `lhr` for London)
4. Click **Create**
5. Go to the database page and find:
   - **Database URL** — looks like `libsql://travelpoints-chezer1234.turso.io`
   - **Create a token** — click "Generate Token", copy it

**Option B: CLI**
```bash
# Install (Mac)
brew install tursodatabase/tap/turso

# Login with GitHub
turso auth login

# Create database
turso db create travelpoints --location lhr

# Get your URL and token
turso db show travelpoints --url
turso db tokens create travelpoints
```

Save both values — you'll need them in the next steps.

---

## 2. Create Render services

Render hosts the Express API and serves the React frontend. Free tier: web service + static site, auto-sleep after 15 min of inactivity.

### Sign up

1. Go to https://render.com and click **Get Started**
2. Sign in with your **GitHub account**
3. Connect the `chezer1234/Traveleria` repository when prompted

### Create the API service (Express backend)

1. Click **New** > **Web Service**
2. Connect the `Traveleria` repo
3. Configure:
   - **Name:** `travelpoints-api`
   - **Region:** Frankfurt EU (or closest to you)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npx knex migrate:latest --knexfile src/db/knexfile.js && npx knex seed:run --knexfile src/db/knexfile.js && node src/index.js`
   - **Instance Type:** Free
4. Add **Environment Variables:**
   - `NODE_ENV` = `production`
   - `TURSO_DATABASE_URL` = your database URL from step 1
   - `TURSO_AUTH_TOKEN` = your token from step 1
   - `PORT` = `3000`
5. Click **Create Web Service**

### Create the frontend service (React)

1. Click **New** > **Static Site**
2. Connect the `Traveleria` repo
3. Configure:
   - **Name:** `travelpoints-web`
   - **Branch:** `main`
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add **Environment Variable:**
   - `VITE_API_URL` = the URL of your API service (e.g. `https://travelpoints-api.onrender.com`)
5. Click **Create Static Site**

---

## 3. Add GitHub secrets

These secrets let the CI pipeline trigger deploys automatically after tests pass.

### Get your Render deploy hook URLs

1. Go to your **travelpoints-api** service on Render
2. Click **Settings** > scroll to **Deploy Hook**
3. Copy the URL — it looks like `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`
4. Do the same for **travelpoints-web**

### Add secrets to GitHub

1. Go to https://github.com/chezer1234/Traveleria/settings/secrets/actions
2. Click **New repository secret** for each:

| Secret name | Where to get it |
|------------|----------------|
| `RENDER_API_DEPLOY_HOOK` | Render > travelpoints-api > Settings > Deploy Hook |
| `RENDER_WEB_DEPLOY_HOOK` | Render > travelpoints-web > Settings > Deploy Hook |

That's it. Once these are set, every push to `main` that passes CI will automatically deploy.

---

## 4. How deployment works

```
Push to main
    |
    v
CI runs (GitHub Actions)
    |-- Install deps
    |-- Run migrations + seeds (local SQLite)
    |-- Run all 88 tests
    |-- Build client
    |-- Smoke test API health endpoint
    |
    v (all green?)
Deploy job triggers
    |-- POST to Render API deploy hook
    |-- POST to Render Web deploy hook
    |-- Both services pull latest code from main and rebuild
    |
    v
Live at your Render URLs
```

The deploy job **only runs on push to `main`** (not on PRs) and **only after tests pass**.

---

## 5. Monitoring deploys

### In GitHub

Every push to `main` creates a workflow run you can check:
- Go to https://github.com/chezer1234/Traveleria/actions
- Look for the latest "CI" run
- The deploy job will show as a separate step with its own pass/fail status

### In Render

- Go to your service dashboard on https://render.com
- Each deploy shows build logs, status (Live / Failed / Building)
- Free tier services sleep after 15 minutes — first visit after sleep takes ~30s

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Deploy didn't trigger | Check the GitHub Actions run — did the test job pass? Deploy only runs after tests. |
| Render build failed | Check Render build logs. Usually a missing dependency or env var. |
| Database errors in production | Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set correctly in Render env vars. |
| App loads but shows no countries | Migrations/seeds haven't run. The start command runs them automatically — check Render logs. |
| API returns CORS errors | Update CORS config in `server/src/index.js` to allow your Render frontend URL. |

---

## Quick reference

| What | Where |
|------|-------|
| Turso dashboard | https://turso.tech/app |
| Render dashboard | https://dashboard.render.com |
| GitHub Actions | https://github.com/chezer1234/Traveleria/actions |
| GitHub secrets | https://github.com/chezer1234/Traveleria/settings/secrets/actions |
| CI workflow file | `.github/workflows/ci.yml` |
