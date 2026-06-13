# Territory Score

**Status:** In progress · **Issue:** [#29](https://github.com/lewismarshall/Traveleria/issues/29) · **Branch:** `feature/territory-score`

## What

Two new, intertwined things:

1. **Log time in a country.** On the existing country detail page, a user can record how long they've spent in a country — either as **dated visits** ("5 days in March 2024") or as **time without a date** ("12 days, can't remember when"). Dates are optional; everything is stored for the user's convenience. Total time per country = the sum of all logged days.

2. **Territory battles.** Tap any other user on the leaderboard to launch a head-to-head. You see a world map with **your** countries in one colour and **theirs** in another. Where you've both been, whoever "owns" the country shows in their colour. Above the map, a **tug-of-war bar** animates to show the percentage split between the two of you, and who's winning.

There are **two battles**, switchable by a tab:

- **Time** — you own a country if you've spent **more days** there.
- **Points** — you own a country if you've earned **more points** there (your personalised country score).

> **This is a pure UX / display feature. It has zero effect on the leaderboard or anyone's actual Travel Points total.** Territory scores are computed on the fly, client-side, from already-synced data.

## Why it matters

Charlie wants travel to feel competitive and fun between friends. A raw leaderboard says "who has more points"; a territory battle says "who *owns the world* between the two of you" — and lets time-on-the-ground matter, not just where you've set foot. The tug-of-war makes the result instantly readable and a little bit thrilling.

## Decisions (from Q&A with Charlie)

| Question | Decision |
|---|---|
| How to log time? | **Both** — dated visits *and* undated time. One `user_country_visits` row per entry (`days` + optional `visited_at`). Total = `SUM(days)`. |
| Unit | **Days.** |
| Opponent | **Any user from the leaderboard.** No friends system — tap a ⚔ on a leaderboard row → `/territory/:userId`. All visit data is already synced locally (that's how the client-side leaderboard works), so a comparison needs no new read API. |
| What decides a country / the score? | **Two separate battles, two tabs.** Time-battle ownership = more days; Points-battle ownership = more points. In **both**, the owner banks **their own personalised points** for that country (consistent with how their leaderboard total is built). |
| Ties / both-zero | A country only one person visited is owned by that person (the other has 0). A country both visited with an equal metric is **contested** — counts for neither, shown in a neutral colour. |

## How it works

### Data model

New table `user_country_visits` (mirrors the `user_cities` / `user_provinces` shape so it rides the existing sync plumbing):

| column | type | notes |
|---|---|---|
| `id` | TEXT PK | client-generated UUID (optimistic-write convention) |
| `user_id` | TEXT FK→users | cascade on user delete |
| `country_code` | TEXT FK→countries | cascade on country delete |
| `days` | INTEGER | ≥ 1 |
| `visited_at` | DATE NULL | optional; not in the future |
| `created_at` | TIMESTAMP | server default |

The existing `user_countries` row stays the canonical "I've been here / it counts for the leaderboard" marker. A country can be visited with **zero** logged time. You must add the country first before logging time in it (same rule as cities/provinces).

This flows through every layer the same way the other user-data tables do:
`migration → /api/snapshot → _changes feed → worker DDL/TABLE_MAP/TABLE_COLUMNS → optimistic mutation → REST route (JWT + ownership + Zod + change feed)`.

### Territory computation (`client/src/lib/territory.js`, pure + unit-tested)

Inputs: each user's visited countries with personalised per-country `total` points (from `getUserCountriesLocal`) and each user's `country_code → days` map.

For every country in the union of the two users' visited sets:

```
aPts / bPts  = each user's own points for the country (0 if not visited)
aDays / bDays= each user's total logged days (0 if none)

owner (Time mode)   : whoever has more days; only-one-visited → that one; equal → contested
owner (Points mode) : whoever has more points; only-one-visited → that one; equal → contested
banked points       : the owner's own points for that country
```

- `scoreA` = Σ banked points over countries A owns; `scoreB` likewise; contested counts for neither.
- `percentA` = `scoreA / (scoreA + scoreB)` (50/50 when both are 0).

### UI

- **Country detail** — a "Time spent here" card (shown once the country is visited): total days, a list of logged visits (days + date, or "no date"), delete buttons, and an inline "add" form (days required, date optional). Optimistic, zero-latency like every other write.
- **Leaderboard** — every *other* user's row gets a ⚔ **Battle** link → `/territory/:userId`.
- **Territory page** (`/territory/:userId`):
  - **Tug-of-war bar** at the top: your colour fills from the left, the opponent's from the right; the divider animates from 50/50 to the real split on load (and replays when you switch tabs). Scores + names at each end, winner gets a 🏆.
  - **Time / Points tabs** re-run the computation and re-animate the bar.
  - **World map** (`react-simple-maps`, shared geo helper with the existing Map page): your countries, their countries, contested, and unvisited each in a distinct colour, with a clear **key**.
  - A short **battlegrounds** list of contested countries.

Colours: you = blue `#3b82f6`, opponent = red `#ef4444`, contested = purple `#a855f7`, unvisited = grey `#d1d5db`.

## Open questions / future

- A per-visit free-text note (e.g. "honeymoon") — skipped for v1 to keep the schema lean.
- Editing a visit in place — v1 is add + delete (delete then re-add to fix).
- Multi-way battles (more than two users) — out of scope; head-to-head only.

## Files touched

- `server/src/db/migrations/20260613001_create_user_country_visits.cjs` (new)
- `server/src/routes/snapshot.js`, `server/src/routes/users.js`, `server/src/lib/schemas.js`
- `client/src/db/worker.js`, `client/src/lib/mutations.js`, `client/src/lib/queries.js`
- `client/src/lib/territory.js` (new), `client/src/lib/geo.js` (new, extracted)
- `client/src/pages/Territory.jsx` (new), `client/src/pages/CountryDetail.jsx`, `client/src/pages/Leaderboard.jsx`, `client/src/pages/Map.jsx`, `client/src/App.jsx`
</invoke>
