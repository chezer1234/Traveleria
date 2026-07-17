// Pure helpers for the leaderboard's global stats mini-section (issue #67):
// most/least logged countries and the choropleth fill scale. Kept separate
// from queries.js (which does the DB work) so they're testable without a DB
// fixture, same split as territory.js / trophies.js.

// Ranks countries by distinct-visitor count. Least-visited countries are
// mostly a tie at zero — "every country matters" (CLAUDE.md), so we don't
// invent a false ranking among them: zero-visit countries are shown
// alphabetically, not sorted as if 0 < 0. If fewer than `limit` countries
// are untouched, the list tops up with the lowest nonzero counts.
export function rankMostLeastVisited(allCountries, visitorsByCountry, limit = 10) {
  const withCounts = allCountries.map((c) => ({
    code: c.code,
    name: c.name,
    visitors: visitorsByCountry[c.code] || 0,
  }));

  const mostVisited = [...withCounts]
    .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name))
    .slice(0, limit);

  const zero = withCounts
    .filter((c) => c.visitors === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  let leastVisited;
  if (zero.length >= limit) {
    leastVisited = zero.slice(0, limit);
  } else {
    const nonZeroAsc = withCounts
      .filter((c) => c.visitors > 0)
      .sort((a, b) => a.visitors - b.visitors || a.name.localeCompare(b.name));
    leastVisited = [...zero, ...nonZeroAsc].slice(0, limit);
  }

  const shownZeroCount = leastVisited.filter((c) => c.visitors === 0).length;
  const moreZeroCount = Math.max(0, zero.length - shownZeroCount);

  return { mostVisited, leastVisited, moreZeroCount };
}

// Choropleth fill opacity: a continuous scale from a visible floor (so any
// visited country reads as distinct from "nobody's been") up to full colour
// at the most-visited country. Unvisited countries get 0 (no tint).
const VISITOR_OPACITY_FLOOR = 0.22;

export function visitorOpacity(count, maxCount) {
  if (!count || !maxCount) return 0;
  return VISITOR_OPACITY_FLOOR + (1 - VISITOR_OPACITY_FLOOR) * (count / maxCount);
}
