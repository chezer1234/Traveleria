export default function ScoreBreakdown({ country, visitedProvinceCodes, visitedCityIds }) {
  const { breakdown, baseline_points, explorer_ceiling, tier } = country;

  if (!breakdown) return null;

  if (breakdown.isMicrostate) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How is this scored?</h2>
        <p className="text-sm text-gray-600">{breakdown.explanation}</p>
      </div>
    );
  }

  const { distance, tourism, size, exploration } = breakdown;

  // Compute actual exploration progress
  const hasProvinces = (tier === 1 || tier === 2) && country.provinces?.length > 0;
  let exploredCount = 0;
  let totalCount = 0;
  let earnedPts = 0;

  if (hasProvinces) {
    totalCount = country.provinces.length;
    exploredCount = visitedProvinceCodes ? visitedProvinceCodes.size : 0;
    earnedPts = country.provinces
      .filter(p => visitedProvinceCodes?.has(p.code))
      .reduce((sum, p) => sum + p.maxPoints, 0);
  } else if (tier === 3 || tier === 1) {
    totalCount = exploration.total || 0;
    exploredCount = visitedCityIds ? visitedCityIds.size : 0;
  }

  const maxTotal = baseline_points + explorer_ceiling;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">How is {country.name} scored?</h2>
        <span className="text-sm font-medium text-indigo-600">{baseline_points} base points</span>
      </div>

      <div className="space-y-5">
        {/* Distance */}
        <BreakdownRow
          icon="🧭"
          question="How far is it?"
          value={distance.km !== null ? `${distance.km.toLocaleString()} km` : 'Unknown'}
          explanation={distance.explanation}
          contribution={`×${distance.multiplier} to your score`}
        />

        {/* Tourism difficulty */}
        <BreakdownRow
          icon="📊"
          question="How hard is it to visit?"
          value={tourism.difficulty}
          explanation={tourism.explanation}
          contribution={`+${tourism.points} to your score`}
        />

        {/* Size */}
        <BreakdownRow
          icon="🗺️"
          question="How big is it?"
          value={`${Number(size.areaKm2).toLocaleString()} km²`}
          explanation={`${size.comparison}. ${size.explanation}.`}
          contribution={`+${size.points} to your score`}
        />

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Exploration */}
        {explorer_ceiling > 0 && (
          <div>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-6 flex-shrink-0">🔍</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">Exploration bonus</p>
                  <span className="text-xs text-gray-500">up to {Math.round(explorer_ceiling)} extra points</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{exploration.explanation}</p>
                {totalCount > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[200px]">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${totalCount > 0 ? Math.min((exploredCount / totalCount) * 100, 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {exploredCount} of {totalCount} {hasProvinces ? 'provinces' : 'cities'}
                      </span>
                    </div>
                    {hasProvinces && earnedPts > 0 && (
                      <p className="text-xs text-indigo-600 mt-1">
                        {Math.round(earnedPts * 10) / 10} / {Math.round(explorer_ceiling * 10) / 10} exploration points earned
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Total */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Base points: </span>
            <span className="font-medium text-gray-900">{baseline_points}</span>
          </div>
          <div>
            <span className="text-gray-500">Max possible: </span>
            <span className="font-medium text-gray-900">{Math.round(maxTotal * 10) / 10}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ icon, question, value, explanation, contribution }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-6 flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{question}</p>
          <span className="text-xs font-medium text-indigo-600">{contribution}</span>
        </div>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{explanation}</p>
      </div>
    </div>
  );
}
