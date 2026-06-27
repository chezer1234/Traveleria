// Territory score (issue #29). Pure comparison of two users over the countries
// they've visited. UX-only — never touches anyone's real Travel Points total.
//
// Two battle modes decide who *owns* each country:
//   - 'time'   → whoever logged more days there
//   - 'points' → whoever earned more points there (their personalised score)
// In both modes the owner banks THEIR OWN points for that country, so the bar is
// always denominated in points. A country only one player visited is owned by
// that player (the other has 0). A country both visited with an equal metric is
// 'contested' and counts for neither.
//
// Groups (issue #37) extend this to N members via computeGroupTerritory().

export const OWNER = { A: 'A', B: 'B', CONTESTED: 'contested', NONE: 'none' };

// Election-map gradient: how dominant is the win?
// Returns 'light' | 'medium' | 'full'.
export function marginGrade(mode, margin) {
  if (mode === 'time') {
    if (margin >= 10) return 'full';
    if (margin >= 5) return 'medium';
    return 'light';
  }
  // points mode: margin is (winner pts - runner-up pts) / runner-up pts * 100
  if (margin >= 50) return 'full';
  if (margin >= 20) return 'medium';
  return 'light';
}

const GRADE_OPACITY = { light: 0.4, medium: 0.7, full: 1.0 };

export function gradeOpacity(grade) {
  return GRADE_OPACITY[grade] ?? 1.0;
}

// Blend a hex colour with opacity toward white, returning an rgba() string.
export function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// `side` shape (one per user): { countries: [{country_code, country_name, total}],
// days: { [country_code]: number } }. `countries` is the getUserCountriesLocal
// result; `total` is that user's personalised points for the country.
export function computeTerritory(sideA, sideB, mode = 'time') {
  const aPts = indexBy(sideA.countries);
  const bPts = indexBy(sideB.countries);
  const aDays = sideA.days || {};
  const bDays = sideB.days || {};

  const codes = new Set([...Object.keys(aPts), ...Object.keys(bPts)]);

  const perCountry = [];
  let scoreA = 0;
  let scoreB = 0;
  let contestedCount = 0;

  for (const code of codes) {
    const a = aPts[code];
    const b = bPts[code];
    const aVisited = !!a;
    const bVisited = !!b;
    const aPoints = aVisited ? a.total : 0;
    const bPoints = bVisited ? b.total : 0;
    const aD = aDays[code] || 0;
    const bD = bDays[code] || 0;

    const metricA = mode === 'time' ? aD : aPoints;
    const metricB = mode === 'time' ? bD : bPoints;

    let owner;
    if (aVisited && !bVisited) owner = OWNER.A;
    else if (bVisited && !aVisited) owner = OWNER.B;
    else if (metricA > metricB) owner = OWNER.A;
    else if (metricB > metricA) owner = OWNER.B;
    else owner = OWNER.CONTESTED;

    // Election-map gradient: margin between 1st and 2nd place.
    let grade = 'full';
    if (owner === OWNER.A || owner === OWNER.B) {
      const winner = metricA > metricB ? metricA : metricB;
      const runnerUp = metricA > metricB ? metricB : metricA;
      const margin = mode === 'time'
        ? winner - runnerUp
        : runnerUp > 0 ? ((winner - runnerUp) / runnerUp) * 100 : 100;
      grade = marginGrade(mode, margin);
    }

    let banked = 0;
    if (owner === OWNER.A) { banked = aPoints; scoreA += aPoints; }
    else if (owner === OWNER.B) { banked = bPoints; scoreB += bPoints; }
    else contestedCount += 1;

    perCountry.push({
      country_code: code,
      country_name: (a && a.country_name) || (b && b.country_name) || code,
      owner,
      grade,
      banked: round1(banked),
      aPoints: round1(aPoints),
      bPoints: round1(bPoints),
      aDays: aD,
      bDays: bD,
      aVisited,
      bVisited,
    });
  }

  scoreA = round1(scoreA);
  scoreB = round1(scoreB);
  const sum = scoreA + scoreB;
  const percentA = sum > 0 ? (scoreA / sum) * 100 : 50;

  perCountry.sort((x, y) => y.banked - x.banked || x.country_name.localeCompare(y.country_name));

  return {
    mode,
    scoreA,
    scoreB,
    percentA: round1(percentA),
    percentB: round1(100 - percentA),
    contestedCount,
    sharedCount: perCountry.filter((c) => c.aVisited && c.bVisited).length,
    perCountry,
    // Map of country_code → owner, for fast map fills.
    ownerByCode: Object.fromEntries(perCountry.map((c) => [c.country_code, c.owner])),
    // Map of country_code → grade, for gradient shading.
    gradeByCode: Object.fromEntries(perCountry.map((c) => [c.country_code, c.grade])),
    winner: scoreA > scoreB ? OWNER.A : scoreB > scoreA ? OWNER.B : OWNER.CONTESTED,
  };
}

// N-player group territory. Each side is:
//   { userId, countries: [{country_code, country_name, total, subregion}], days: {[code]: number} }
//
// Returns:
//   scores: { [userId]: number }          — total banked points
//   perCountry: [{country_code, country_name, subregion, owner (userId|'contested'|'none'),
//                 grade, ownerPoints, memberMetrics: {[userId]: {points, days}} }]
//   ownerByCode: { [code]: userId | 'contested' | 'none' }
//   gradeByCode: { [code]: 'light'|'medium'|'full' }
//   continentScores: { [continent]: { [userId]: number } }
//   contestedCount: number
export function computeGroupTerritory(sides, mode = 'time') {
  const scores = {};
  for (const s of sides) scores[s.userId] = 0;

  // Build per-user indexes.
  const ptsByUser = {};
  const daysByUser = {};
  for (const s of sides) {
    ptsByUser[s.userId] = indexBy(s.countries);
    daysByUser[s.userId] = s.days || {};
  }

  // Collect all country codes any member has visited.
  const codes = new Set();
  for (const s of sides) {
    for (const c of s.countries) codes.add(c.country_code);
  }

  const perCountry = [];
  const continentScores = {};
  let contestedCount = 0;

  for (const code of codes) {
    // Gather each member's metric and points for this country.
    const memberMetrics = {};
    let countryName = code;
    let subregion = null;

    for (const s of sides) {
      const entry = ptsByUser[s.userId][code];
      const pts = entry ? entry.total : 0;
      const days = daysByUser[s.userId][code] || 0;
      memberMetrics[s.userId] = { points: round1(pts), days };
      if (entry) {
        countryName = entry.country_name || countryName;
        subregion = entry.subregion || subregion;
      }
    }

    // Sort members by metric descending.
    const metric = (uid) => mode === 'time' ? memberMetrics[uid].days : memberMetrics[uid].points;
    const sorted = sides.map((s) => s.userId).sort((a, b) => metric(b) - metric(a));

    const best = metric(sorted[0]);
    const second = sorted.length > 1 ? metric(sorted[1]) : 0;

    let owner;
    let grade = 'full';
    let ownerPoints = 0;

    if (best === 0) {
      owner = 'none';
    } else if (best === second) {
      owner = 'contested';
      contestedCount += 1;
    } else {
      owner = sorted[0];
      ownerPoints = memberMetrics[owner].points;
      scores[owner] = round1(scores[owner] + ownerPoints);

      const margin = mode === 'time'
        ? best - second
        : second > 0 ? ((best - second) / second) * 100 : 100;
      grade = marginGrade(mode, margin);

      // Accumulate continent scores.
      if (subregion) {
        // continent mapping is done in the caller/UI layer to keep this pure
        const cont = subregion;
        if (!continentScores[cont]) continentScores[cont] = {};
        continentScores[cont][owner] = round1((continentScores[cont][owner] || 0) + ownerPoints);
      }
    }

    perCountry.push({
      country_code: code,
      country_name: countryName,
      subregion,
      owner,
      grade,
      ownerPoints: round1(ownerPoints),
      memberMetrics,
    });
  }

  perCountry.sort((x, y) => y.ownerPoints - x.ownerPoints || x.country_name.localeCompare(y.country_name));

  return {
    mode,
    scores,
    perCountry,
    ownerByCode: Object.fromEntries(perCountry.map((c) => [c.country_code, c.owner])),
    gradeByCode: Object.fromEntries(perCountry.map((c) => [c.country_code, c.grade])),
    continentScores,
    contestedCount,
  };
}

// Resolve the display colour for each member given their primary/secondary picks
// and the colours already claimed by earlier members.
// members: [{ userId, primary_colour, secondary_colour }] ordered by joined_at asc.
// Returns { [userId]: hexString }
const FALLBACK_PALETTE = [
  '#f97316', '#84cc16', '#06b6d4', '#a855f7', '#ec4899',
  '#14b8a6', '#f59e0b', '#6366f1', '#64748b', '#10b981',
];

export function resolveColours(members) {
  const used = new Set();
  const result = {};
  let fallbackIdx = 0;

  for (const m of members) {
    const primary = m.primary_colour?.toLowerCase();
    const secondary = m.secondary_colour?.toLowerCase();

    if (primary && !used.has(primary)) {
      result[m.userId] = primary;
      used.add(primary);
    } else if (secondary && !used.has(secondary)) {
      result[m.userId] = secondary;
      used.add(secondary);
    } else {
      while (fallbackIdx < FALLBACK_PALETTE.length && used.has(FALLBACK_PALETTE[fallbackIdx])) {
        fallbackIdx++;
      }
      const colour = FALLBACK_PALETTE[fallbackIdx] || '#888888';
      result[m.userId] = colour;
      used.add(colour);
      fallbackIdx++;
    }
  }

  return result;
}

function indexBy(countries) {
  const m = {};
  for (const c of countries || []) m[c.country_code] = c;
  return m;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
