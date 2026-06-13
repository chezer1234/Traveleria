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

export const OWNER = { A: 'A', B: 'B', CONTESTED: 'contested', NONE: 'none' };

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

    let banked = 0;
    if (owner === OWNER.A) { banked = aPoints; scoreA += aPoints; }
    else if (owner === OWNER.B) { banked = bPoints; scoreB += bPoints; }
    else contestedCount += 1;

    perCountry.push({
      country_code: code,
      country_name: (a && a.country_name) || (b && b.country_name) || code,
      owner,
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
    winner: scoreA > scoreB ? OWNER.A : scoreB > scoreA ? OWNER.B : OWNER.CONTESTED,
  };
}

function indexBy(countries) {
  const m = {};
  for (const c of countries || []) m[c.country_code] = c;
  return m;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
