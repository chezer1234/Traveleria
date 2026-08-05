// Pure helper for the Stats page's points-over-time graph (issue #75, phase
// 1). Kept separate from queries.js (which does the DB work), same split as
// globalStats.js / territory.js — testable without a DB fixture.
//
// The graph plots "points as you've logged them" (CLAUDE.md wording in the
// issue) using created_at — when a row was logged in the app — not
// visited_at, which is optional and often missing. See
// docs/features/stats-points-history.md for the Q&A behind that call.
//
// Approach: every country/province/city/experience log is a "point event".
// Replaying those events in created_at order and re-running the existing
// scoring engine (calculateCountryPoints) after each one gives an exact,
// formula-consistent running total — no separate incremental-points formula
// to keep in sync with points.js.

import { calculateCountryPoints } from './points.js';

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * @param {object} homeCountry - the user's home country row, or null.
 * @param {object[]} allCountries - every country row (for distance/tourism lookups).
 * @param {Object<string, {country: object, allProvinces: object[], allCities: object[], allExperiences: object[]}>} countryRefs
 *   Static reference data per visited country code — doesn't change over time.
 * @param {{type: 'country'|'province'|'city'|'experience', country_code: string, ref_id?: string, created_at: string}[]} events
 *   One entry per logged row (user_countries / user_provinces / user_cities /
 *   user_province_experiences), unsorted.
 * @returns {{date: string, totalPoints: number}[]} cumulative running total
 *   after each event, in chronological order. Empty array if there are no events.
 */
export function buildPointsHistory(homeCountry, allCountries, countryRefs, events) {
  // Rows synced before issue #75 (or ones a resync hasn't backfilled yet)
  // can have a null created_at — drop them rather than let NaN dates corrupt
  // the sort and land the point at an undefined spot on the x-axis.
  const dated = events.filter((e) => e.created_at && !isNaN(new Date(e.created_at).getTime()));
  const sorted = dated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const state = {}; // country_code -> { visitedProvinces, visitedCities, visitedExperienceIds }
  const totalByCountry = {}; // country_code -> that country's current total
  let runningTotal = 0;

  const history = [];

  for (const event of sorted) {
    const refs = countryRefs[event.country_code];
    if (!refs) continue; // defensive — shouldn't happen, but don't blow up the graph over one bad row

    const s = (state[event.country_code] ||= { visitedProvinces: [], visitedCities: [], visitedExperienceIds: [] });

    if (event.type === 'province') {
      const p = refs.allProvinces.find((x) => x.code === event.ref_id);
      if (p) s.visitedProvinces.push(p);
    } else if (event.type === 'city') {
      const c = refs.allCities.find((x) => String(x.id) === String(event.ref_id));
      if (c) s.visitedCities.push(c);
    } else if (event.type === 'experience') {
      s.visitedExperienceIds.push(event.ref_id);
    }
    // 'country' events need no state change — the entry above already exists.

    const pts = calculateCountryPoints(refs.country, homeCountry, allCountries, {
      visitedProvinces: s.visitedProvinces,
      visitedCities: s.visitedCities,
      allProvinces: refs.allProvinces,
      allCities: refs.allCities,
      allExperiences: refs.allExperiences,
      visitedExperienceIds: s.visitedExperienceIds,
    });

    const prev = totalByCountry[event.country_code] || 0;
    runningTotal += pts.total - prev;
    totalByCountry[event.country_code] = pts.total;

    history.push({ date: event.created_at, totalPoints: round2(runningTotal) });
  }

  return history;
}

/**
 * Collapses a (possibly dense) event-level history down to one point per
 * calendar day — the last running total logged that day — for a cleaner
 * graph. `date` strings are compared by their leading YYYY-MM-DD, so this
 * works for both date-only and full timestamp inputs.
 */
export function bucketHistoryByDay(history) {
  const byDay = new Map();
  for (const point of history) {
    const day = point.date.slice(0, 10);
    byDay.set(day, point.totalPoints); // later entries for the same day overwrite — we want the last
  }
  return Array.from(byDay.entries()).map(([day, totalPoints]) => ({ date: day, totalPoints }));
}
