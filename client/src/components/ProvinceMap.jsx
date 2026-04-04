import { useState, useEffect, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';

/**
 * Interactive province map for a country. Uses d3-geo with fitExtent.
 * Splits features into a main landmass and overseas/outlier insets.
 */

export default function ProvinceMap({ countryCode, provinces, visitedCodes, onToggle, disabled }) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setLoading(true);
    setGeoData(null);
    fetch(`/geo/${countryCode}.json`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => { setGeoData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [countryCode]);

  const provinceMap = useMemo(() => {
    const map = {};
    for (const p of provinces) map[p.code] = p;
    return map;
  }, [provinces]);

  // Split features into main cluster + outliers
  const { mainFeatures, outlierFeatures } = useMemo(() => {
    if (!geoData || !geoData.features.length) return { mainFeatures: [], outlierFeatures: [] };

    const features = geoData.features;
    if (features.length <= 4) return { mainFeatures: features, outlierFeatures: [] };

    // Get average lon/lat of each feature
    function getCentroid(feature) {
      let sumLon = 0, sumLat = 0, n = 0;
      function walk(coords) {
        if (typeof coords[0] === 'number') { sumLon += coords[0]; sumLat += coords[1]; n++; return; }
        coords.forEach(walk);
      }
      walk(feature.geometry.coordinates);
      return n > 0 ? [sumLon / n, sumLat / n] : null;
    }

    const items = features.map(f => ({ feature: f, c: getCentroid(f) })).filter(x => x.c);

    // Pre-filter: move any single feature that spans > 40° longitude to outliers
    // (these cross the antimeridian or are otherwise too wide to cluster, e.g. Alaska)
    const wideFeatures = [];
    const normalItems = items.filter(item => {
      let minLon = 999, maxLon = -999;
      function walk(c) { if (typeof c[0] === 'number') { minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]); return; } c.forEach(walk); }
      walk(item.feature.geometry.coordinates);
      if (maxLon - minLon > 40) { wideFeatures.push(item.feature); return false; }
      return true;
    });

    // Find densest longitude window (60 degrees wide — covers contiguous US, mainland China, etc.)
    if (normalItems.length === 0) return { mainFeatures: features, outlierFeatures: [] };
    const sorted = [...normalItems].sort((a, b) => a.c[0] - b.c[0]);
    let bestStart = 0, bestCount = 0;
    for (let i = 0; i < sorted.length; i++) {
      let j = i;
      while (j < sorted.length && sorted[j].c[0] - sorted[i].c[0] <= 60) j++;
      if (j - i > bestCount) { bestCount = j - i; bestStart = i; }
    }

    let cluster = sorted.slice(bestStart, bestStart + bestCount);

    // Second pass: also filter by latitude to remove outliers like Alaska
    // Find median latitude, remove features >20 degrees from median
    if (cluster.length > 4) {
      const lats = cluster.map(x => x.c[1]).sort((a, b) => a - b);
      const medLat = lats[Math.floor(lats.length / 2)];
      const latFiltered = cluster.filter(x => Math.abs(x.c[1] - medLat) <= 20);
      if (latFiltered.length >= Math.floor(cluster.length * 0.6)) {
        cluster = latFiltered;
      }
    }

    const mainSet = new Set(cluster.map(x => x.feature));
    const main = features.filter(f => mainSet.has(f));
    const outliers = [...wideFeatures, ...features.filter(f => !mainSet.has(f) && !wideFeatures.includes(f))];

    return { mainFeatures: main, outlierFeatures: outliers };
  }, [geoData]);

  const handleClick = useCallback((code) => {
    if (disabled || !provinceMap[code]) return;
    onToggle(code);
  }, [disabled, onToggle, provinceMap]);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!geoData) return null;

  return (
    <div className="relative mb-6" onMouseMove={handleMouseMove}>
      {/* Main map — height adapts to content aspect ratio */}
      <MapPanel
        features={mainFeatures}
        allFeatures={mainFeatures}
        provinceMap={provinceMap}
        visitedCodes={visitedCodes}
        onClick={handleClick}
        onHover={setTooltip}
        disabled={disabled}
        padding={20}
      />

      {/* Outlier insets */}
      {outlierFeatures.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {outlierFeatures.map((f, i) => (
            <div key={f.properties.code || i} className="flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1 px-1">
                {provinceMap[f.properties.code]?.name || f.properties.name}
              </p>
              <MapPanel
                features={[f]}
                allFeatures={[f]}
                provinceMap={provinceMap}
                visitedCodes={visitedCodes}
                onClick={handleClick}
                onHover={setTooltip}
                disabled={disabled}
                width={180}
                height={120}
                padding={8}
                small
              />
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={{ left: mousePos.x + 12, top: mousePos.y - 40 }}
        >
          <p className="font-medium">{tooltip.name}</p>
          <p className="text-gray-300">
            {tooltip.points} pts {tooltip.visited ? '(visited)' : ''}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 px-1">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Visited
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-300"></span> Not visited
        </div>
        <span className="ml-auto">Click provinces to toggle</span>
      </div>
    </div>
  );
}

function MapPanel({ features, allFeatures, provinceMap, visitedCodes, onClick, onHover, disabled, width: fixedWidth, height: fixedHeight, padding, small }) {
  const { pathGen, width, height, viewBox } = useMemo(() => {
    if (!features.length) return { pathGen: null, width: 800, height: 500 };

    // Fit projection only to matched features so unmatched territories don't expand the bounding box
    const matched = features.filter(f => provinceMap[f.properties.code]);
    const fitTo = matched.length > 0 ? matched : features;

    const collection = { type: 'FeatureCollection', features: fitTo };

    if (fixedWidth && fixedHeight) {
      // Fixed size (small insets)
      const proj = geoMercator().fitExtent(
        [[padding, padding], [fixedWidth - padding, fixedHeight - padding]],
        collection
      );
      return { pathGen: geoPath().projection(proj), width: fixedWidth, height: fixedHeight };
    }

    // Dynamic: fit to a large canvas, then crop the viewBox to the actual content bounds
    const canvas = 2000;
    const proj = geoMercator().fitExtent(
      [[padding, padding], [canvas - padding, canvas - padding]],
      collection
    );
    const pg = geoPath().projection(proj);
    const b = pg.bounds(collection);

    // Crop viewBox to content bounds with padding
    const vx = Math.max(0, Math.floor(b[0][0]) - padding);
    const vy = Math.max(0, Math.floor(b[0][1]) - padding);
    const vw = Math.ceil(b[1][0] - b[0][0]) + padding * 2;
    const vh = Math.ceil(b[1][1] - b[0][1]) + padding * 2;

    return { pathGen: pg, width: vw, height: vh, viewBox: `${vx} ${vy} ${vw} ${vh}` };
  }, [features, provinceMap, fixedWidth, fixedHeight, padding]);

  if (!pathGen) return null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${small ? 'inline-block' : ''}`}>
      <svg
        viewBox={viewBox || `0 0 ${width} ${height}`}
        style={{ width: small ? `${width}px` : '100%', height: 'auto' }}
        className="block"
      >
        {allFeatures.map((feature, i) => {
          const code = feature.properties.code;
          const province = provinceMap[code];
          const isVisited = visitedCodes.has(code);
          const isMatched = !!province;
          if (!isMatched) return null; // Skip unmatched territories
          const d = pathGen(feature);
          if (!d) return null;

          return (
            <path
              key={code || i}
              d={d}
              fill={!isMatched ? '#f3f4f6' : isVisited ? '#6366f1' : '#d1d5db'}
              stroke="#fff"
              strokeWidth={small ? 0.3 : 0.5}
              style={{
                cursor: isMatched && !disabled ? 'pointer' : 'default',
                transition: 'fill 0.15s ease',
              }}
              onClick={() => onClick(code)}
              onMouseEnter={(e) => {
                if (province) {
                  e.target.style.fill = isVisited ? '#4f46e5' : '#a5b4fc';
                  onHover({ name: province.name, code, points: province.maxPoints, visited: isVisited });
                }
              }}
              onMouseLeave={(e) => {
                if (province) e.target.style.fill = isVisited ? '#6366f1' : '#d1d5db';
                onHover(null);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
