export default function ScoreBreakdown({ country, visitedProvinceCodes, visitedCityIds, scoreDetail }) {
  const { breakdown, baseline_points, explorer_ceiling, tier } = country;

  if (!breakdown) return null;

  if (breakdown.isMicrostate) {
    return (
      <div className="plate rounded-lg mb-6">
        <div className="text-center px-5 pt-5 pb-4 border-b border-hairline">
          <h2 className="font-display font-black text-xl tracking-[0.08em] text-ink">THE RECKONING</h2>
          <p className="smallcaps text-ink-soft mt-1">How is this scored?</p>
        </div>
        <p className="text-sm text-ink-soft px-5 py-4">{breakdown.explanation}</p>
      </div>
    );
  }

  const { distance, tourism, size, exploration } = breakdown;

  // Compute actual exploration progress. Tier 0 uses the real per-province
  // earned/max (90%-140%+ scale) from scoreDetail when available; Tier 1/2
  // fall back to the simpler "visited = full maxPoints" approximation.
  const hasProvinces = (tier === 0 || tier === 1 || tier === 2) && country.provinces?.length > 0;
  let exploredCount = 0;
  let totalCount = 0;
  let earnedPts = 0;
  let maxExplorationPts = explorer_ceiling;

  if (hasProvinces) {
    totalCount = country.provinces.length;
    exploredCount = visitedProvinceCodes ? visitedProvinceCodes.size : 0;
    if (tier === 0 && scoreDetail?.provinceBreakdown) {
      earnedPts = scoreDetail.provinceBreakdown.reduce((sum, p) => sum + p.earnedPoints, 0);
      maxExplorationPts = scoreDetail.provinceBreakdown.reduce((sum, p) => sum + p.maxPoints, 0);
    } else {
      earnedPts = country.provinces
        .filter(p => visitedProvinceCodes?.has(p.code))
        .reduce((sum, p) => sum + p.maxPoints, 0);
    }
  } else if (tier === 3 || tier === 1) {
    totalCount = exploration.total || 0;
    exploredCount = visitedCityIds ? visitedCityIds.size : 0;
  }

  const maxTotal = baseline_points + explorer_ceiling;

  // Printed-sum strip: base = multiplier × (tourism + size). Only shown when
  // every piece exists AND the arithmetic matches the displayed base — the
  // engine's floor (5) and cap (200) can override the raw formula, and a sum
  // that doesn't add up would betray the whole ledger.
  const sumPieces = [distance?.multiplier, tourism?.points, size?.points, baseline_points];
  const showSum =
    sumPieces.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(distance.multiplier * (tourism.points + size.points) - baseline_points) < 0.25;

  return (
    <div className="plate rounded-lg mb-6">
      <div className="text-center px-5 pt-5 pb-4 border-b border-hairline">
        <h2 className="font-display font-black text-xl tracking-[0.08em] text-ink">THE RECKONING</h2>
        <p className="smallcaps text-ink-soft mt-1">
          How is {country.name} scored? &middot; every line traceable, nothing hidden
        </p>
      </div>

      {/* Distance */}
      <BreakdownRow
        icon="🧭"
        question="How far is it?"
        sublabel="Distance from home"
        value={distance.km !== null ? `${distance.km.toLocaleString()} km` : 'Unknown'}
        explanation={distance.explanation}
        contribution={`×${distance.multiplier}`}
      />

      {/* Tourism difficulty */}
      <BreakdownRow
        icon="📊"
        question="How hard is it to visit?"
        sublabel="Tourism difficulty"
        value={tourism.difficulty}
        explanation={tourism.explanation}
        contribution={`+${tourism.points}`}
      />

      {/* Size */}
      <BreakdownRow
        icon="🗺️"
        question="How big is it?"
        sublabel="Country size"
        value={`${Number(size.areaKm2).toLocaleString()} km²`}
        explanation={`${size.comparison}. ${size.explanation}.`}
        contribution={`+${size.points}`}
      />

      {/* Printed sum — base points arithmetic, accounts-book style */}
      {showSum && (
        <div className="bg-paper border-b border-hairline text-center px-5 py-3">
          <p className="smallcaps text-ink-soft">Base points, the printed sum</p>
          <p className="font-display text-xl text-ink tabular-nums mt-0.5">
            {distance.multiplier} × ({tourism.points} + {size.points}) ={' '}
            <b className="font-black border-b-[3px] border-double border-ink pb-px">{baseline_points}</b>
          </p>
        </div>
      )}

      {/* Exploration */}
      {explorer_ceiling > 0 && (
        <div className="flex items-start gap-3 px-5 py-4 border-b border-hairline">
          <span className="text-lg leading-6 flex-shrink-0">🔍</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-ink">Exploration bonus</p>
                <p className="smallcaps text-ink-soft/70 text-[10px]">
                  up to {Math.round(maxExplorationPts)} extra points
                </p>
              </div>
              {hasProvinces && earnedPts > 0 && (
                <span className="border border-ink bg-paper px-2 py-0.5 font-display font-bold tabular-nums text-sm text-ink whitespace-nowrap">
                  +{Math.round(earnedPts * 10) / 10}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft mt-1">{exploration.explanation}</p>
            {totalCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-parchment rounded-full h-1.5 max-w-[200px]">
                    <div
                      className="bg-atlas h-1.5 rounded-full transition-all"
                      style={{ width: `${totalCount > 0 ? Math.min((exploredCount / totalCount) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-soft">
                    {exploredCount} of {totalCount} {hasProvinces ? 'provinces' : 'cities'}
                  </span>
                </div>
                {hasProvinces && earnedPts > 0 && (
                  <p className="text-xs text-ink tabular-nums mt-1">
                    {Math.round(earnedPts * 10) / 10} / {Math.round(maxExplorationPts * 10) / 10} exploration points earned
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-4">
        <div>
          <span className="smallcaps text-ink-soft">Base points: </span>
          <span className="font-display font-bold tabular-nums text-ink">{baseline_points}</span>
        </div>
        <div>
          <span className="smallcaps text-ink-soft">Max possible: </span>
          <span className="font-display font-bold tabular-nums text-ink">{Math.round(maxTotal * 10) / 10}</span>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ icon, question, sublabel, value, explanation, contribution }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-hairline">
      <span className="text-lg leading-6 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-ink">{question}</p>
            {sublabel && <p className="smallcaps text-ink-soft/70 text-[10px]">{sublabel}</p>}
          </div>
          <span className="border border-ink bg-paper px-2 py-0.5 font-display font-bold tabular-nums text-sm text-ink whitespace-nowrap">
            {contribution}
          </span>
        </div>
        <p className="text-sm font-semibold text-ink mt-1">{value}</p>
        <p className="text-sm text-ink-soft mt-0.5">{explanation}</p>
      </div>
    </div>
  );
}
