# Groups

**Branch:** `feature/groups` (not yet created)
**Status:** Ready to implement
**Issue:** #37
**Last Updated:** 2026-06-27

---

## 1. What It Is

Groups let you save a named set of travellers and run a shared territory battle across all of them — same Time and Points modes as the existing 1v1 battle, extended to N people. Like the battle feature, groups are **display-only** and have **no effect on actual Traveleria points or the leaderboard**.

A user can belong to multiple groups and can revisit any saved group at any time to see the current standings.

---

## 2. Core Concepts

### 2.1 Group

A named, persistent collection of users (including the creator). Members are picked from the leaderboard. No hard max size — the UI will work with however many users exist on the platform.

### 2.2 Member Colours

Each member chooses a **primary** and **secondary** colour when they join or configure a group. Colours determine how countries appear on the group map.

**Conflict resolution order:**
1. Use the member's **primary** colour if no other member's resolved display colour is the same.
2. If the primary conflicts, use the **secondary**.
3. If both conflict (e.g. large group where multiple people share both colours), the system **auto-assigns** a fallback from a preset accessible palette — picking the first colour not already in use by anyone else in the group.

Colour is per-group, not global — the same person can have different colours in different groups.

### 2.3 Modes

Identical to the 1v1 battle:
- **Time battle** — who spent the most days in a country owns it (plurality).
- **Points battle** — who earned the most points in a country owns it (plurality).

Exact tie → **contested** (shown as a striped/neutral colour on the map, listed below the map as contested countries).

No one visited → grey.

### 2.4 Election-Map Colour Gradient

The colour of an owned country is shaded by **margin of victory**, not binary win/lose. Inspired by election maps.

**Time mode — margin in days:**

| Margin over 2nd place | Shade |
|-----------------------|-------|
| 1–4 days | Light (40% opacity of the member's colour) |
| 5–9 days | Medium (70%) |
| 10+ days | Full / dark (100%) |

**Points mode — margin as % of 2nd place's score:**

| Margin over 2nd place | Shade |
|-----------------------|-------|
| < 20% | Light (40%) |
| 20–49% | Medium (70%) |
| 50%+ | Full / dark (100%) |

The gradient applies to both group maps **and** the existing 1v1 battle map (see section 6).

---

## 3. Score and Bar Graph

Score is computed exactly as in the territory battle — each member banks their own personalised points for every country they own. The bar graph on the group page shows:

- **Overall bar** — cumulative score across all owned countries. Animates out from 50/50 (or equal split for N people) at page load, counts up to the real values.
- **Per-continent bars** — one bar per the 7 British-school continents. Shows each member's score for countries they own in that continent. Antarctica is omitted (no countries in the app).

Example: Lewis wins Europe (he's visited 34 countries), Charlie wins Asia (more adventurous destinations). Both charts update in real time as the mode toggle (Time / Points) changes.

### Continent Mapping

The `subregion` column in the `countries` table uses UN M.49 names. These map to the 7 British-school continents as follows:

| Continent | UN M.49 Subregions |
|-----------|-------------------|
| **Africa** | Northern Africa, Western Africa, Middle Africa, Eastern Africa, Southern Africa |
| **Asia** | Western Asia, Central Asia, Southern Asia, South-Eastern Asia, Eastern Asia |
| **Europe** | Northern Europe, Western Europe, Southern Europe, Eastern Europe |
| **North America** | Northern America, Central America, Caribbean |
| **South America** | South America |
| **Oceania** | Australia and New Zealand, Melanesia, Micronesia, Polynesia |
| **Antarctica** | *(omitted — no countries in app)* |

This mapping lives in `client/src/lib/continents.js` (new file) as a lookup constant.

---

## 4. Pages and Routes

### 4.1 Groups List — `/groups`

- Lists all groups the current user belongs to (created by them or others).
- Each row: group name, member count, member colour chips, last viewed.
- "New group" button → group creation flow.

### 4.2 Group Creation

- Name the group.
- Pick members from the leaderboard (same picker as "⚔ Battle" flow, but multi-select).
- Creator's own colours are set here too.
- Members are added immediately — no invite/acceptance flow for now.

### 4.3 Group Battle Page — `/groups/:groupId`

Layout mirrors the 1v1 territory page:
- Group name + member list with colour chips.
- Mode toggle: Time / Points.
- Animated score bar (overall).
- World map with election-gradient colouring.
- Per-continent bars below the map.
- Contested country list.
- "Edit group" / "Leave group" actions.

### 4.4 Leaderboard Update

- "⚔ Battle" per-row link stays as-is (1v1).
- Add a "＋ Group" button or a multi-select mode so you can pick several people and create a group directly from the leaderboard.

---

## 5. Group Management

| Action | Who can do it |
|--------|--------------|
| Rename group | Creator only |
| Add members | Creator only (for now) |
| Remove a member | Creator only |
| Change own colours | Any member |
| Leave group | Any member |
| Delete group | Creator only |

**Creator leaves edge case:** Ownership transfers to the member with the earliest `joined_at` timestamp (i.e. whoever joined next after the creator). They become the new creator and inherit rename/add/remove rights. If they are the last member, the group is deleted.

---

## 6. 1v1 Battle Map Upgrade

The existing `/territory/:userId` battle page gets the election-map gradient added. No other changes — just the shading logic on top of the colour that's already there. The "you / them / contested / neither" colour assignment stays the same; the win shade now varies.

---

## 7. Data Model

### New Tables

```sql
-- groups
id           text PRIMARY KEY,        -- UUID
name         text NOT NULL,
created_by   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
created_at   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP

-- group_members
id             text PRIMARY KEY,      -- UUID
group_id       text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
user_id        text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
primary_colour text NOT NULL,         -- hex string, e.g. '#3B82F6'
secondary_colour text NOT NULL,
joined_at      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
UNIQUE(group_id, user_id)
```

### No Changes to Existing Tables

`user_country_visits`, `user_countries`, `user_provinces` — unchanged. The group battle reads these at query time, same as the 1v1 battle.

---

## 8. API Endpoints

```
POST   /api/groups                              — create group (name + initial member list)
GET    /api/groups                              — list groups the current user belongs to
GET    /api/groups/:id                          — group metadata + members + their colour assignments
PATCH  /api/groups/:id                          — update name or member list
DELETE /api/groups/:id                          — delete group (creator only)
PATCH  /api/groups/:id/members/me/colours       — update current user's colours for this group
DELETE /api/groups/:id/members/me              — leave group
DELETE /api/groups/:id/members/:userId         — remove member (creator only)
```

The group battle comparison data (who owns which country, continent breakdown) is computed **client-side** from locally synced visit data — same as the 1v1 battle. The API only serves group metadata.

---

## 9. Sync

`groups` and `group_members` are added to:
- Server migrations
- `/api/snapshot` response
- `_changes` feed (insert/update/delete events)
- Client worker DDL (`TABLE_MAP`, `TABLE_COLUMNS`)
- Optimistic mutations for create/leave/delete

---

## 10. Open Questions

All resolved.

| # | Question | Decision |
|---|----------|----------|
| OQ-1 | Points mode gradient threshold | ✅ % system confirmed: <20% light, 20–49% medium, 50%+ full |
| OQ-2 | Creator leaves | ✅ Transfer to member with earliest `joined_at`; delete if last member |
| OQ-3 | Continent grouping | ✅ 7 British-school continents; mapping in section 3 above |

---

## 11. Implementation Sequence

1. Write migrations (`groups`, `group_members`).
3. Wire into snapshot + changes feed + client DDL.
4. Build group CRUD API routes.
5. Add election-gradient to existing 1v1 battle map (small, self-contained change — good warm-up).
6. Build `/groups` list page + creation flow.
7. Build `/groups/:id` battle page — mode toggle, score bar, continent bars.
8. Add election-gradient to group map.
9. Update leaderboard with multi-select "create group" flow.
10. Tests: territory.js comparison function extended for N people + new group routes.
