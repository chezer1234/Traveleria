import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoMercator, geoPath } from 'd3-geo';

const EUROPEAN_TIER2 = ['GB', 'DE', 'FR', 'IT', 'ES', 'AT', 'NL', 'CZ', 'RO'];

// Continental Europe bounding box — filters out overseas territories (Guadeloupe,
// Réunion, French Guiana, etc.) so they don't blow up the projection.
function isEuropeanFeature(feature) {
  const geo = feature.geometry;
  if (!geo) return false;
  const rings = geo.type === 'Polygon' ? [geo.coordinates[0]] : geo.coordinates.map(p => p[0]);
  let sumLng = 0, sumLat = 0, n = 0;
  for (const ring of rings) {
    for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; n++; }
  }
  if (n === 0) return false;
  const cLng = sumLng / n;
  const cLat = sumLat / n;
  return cLng >= -15 && cLng <= 42 && cLat >= 34 && cLat <= 72;
}

export default function EuropeProvinceMap({ visitedProvinceCodes }) {
  const navigate = useNavigate();
  const [geoByCountry, setGeoByCountry] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      EUROPEAN_TIER2.map(cc =>
        fetch(`/geo/${cc}.json`)
          .then(r => (r.ok ? r.json() : null))
          .then(data => ({ cc, data }))
          .catch(() => ({ cc, data: null })),
      ),
    ).then(results => {
      if (cancelled) return;
      const loaded = {};
      for (const { cc, data } of results) {
        if (data) loaded[cc] = data;
      }
      setGeoByCountry(loaded);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Flatten to continental features only (for projection fitting)
  const continentalFeatures = useMemo(() => {
    return Object.values(geoByCountry)
      .flatMap(d => (d?.features || []))
      .filter(isEuropeanFeature);
  }, [geoByCountry]);

  // D3 projection fitted to all continental European province features
  const { pathGen, viewBox } = useMemo(() => {
    if (continentalFeatures.length === 0) return {};
    const canvas = 1000;
    const pad = 20;
    const collection = { type: 'FeatureCollection', features: continentalFeatures };
    const proj = geoMercator().fitExtent(
      [[pad, pad], [canvas - pad, canvas - pad]],
      collection,
    );
    const pg = geoPath().projection(proj);
    const b = pg.bounds(collection);
    const vx = Math.max(0, Math.floor(b[0][0]) - pad);
    const vy = Math.max(0, Math.floor(b[0][1]) - pad);
    const vw = Math.ceil(b[1][0] - b[0][0]) + pad * 2;
    const vh = Math.ceil(b[1][1] - b[0][1]) + pad * 2;
    return { pathGen: pg, viewBox: `${vx} ${vy} ${vw} ${vh}` };
  }, [continentalFeatures]);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-panel rounded-lg border border-hairline">
        <p className="text-sm text-ink-soft">Loading provinces…</p>
      </div>
    );
  }

  return (
    <div className="plate rounded-lg p-2 sm:p-4 relative"
         onMouseMove={handleMouseMove}>
      <svg
        viewBox={viewBox}
        style={{ width: '100%', height: 'auto' }}
        className="block"
      >
        {EUROPEAN_TIER2.map(cc => {
          const countryData = geoByCountry[cc];
          if (!countryData) return null;
          return countryData.features
            .filter(isEuropeanFeature)
            .map(feature => {
              const code = feature.properties.code;
              const name = feature.properties.name;
              const isVisited = visitedProvinceCodes.has(code);
              const d = pathGen(feature);
              if (!d) return null;
              return (
                <path
                  key={code}
                  d={d}
                  strokeWidth={0.5}
                  style={{
                    fill: isVisited ? 'var(--color-atlas)' : 'var(--color-parchment)',
                    stroke: 'var(--color-paper)',
                    cursor: 'pointer',
                    transition: 'fill 0.15s ease',
                  }}
                  onClick={() => navigate(`/countries/${cc}`)}
                  onMouseEnter={e => {
                    e.target.style.fill = isVisited ? 'var(--color-atlas-deep)' : 'var(--color-parchment-deep)';
                    setTooltip({ name, isVisited });
                  }}
                  onMouseLeave={e => {
                    e.target.style.fill = isVisited ? 'var(--color-atlas)' : 'var(--color-parchment)';
                    setTooltip(null);
                  }}
                />
              );
            });
        })}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-ink text-paper text-xs rounded px-2 py-1"
          style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
        >
          {tooltip.name} {tooltip.isVisited ? '✓' : ''}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mt-3 smallcaps text-ink-soft">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-atlas inline-block" />
          Visited province
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-parchment border border-hairline inline-block" />
          Not visited
        </div>
        <span className="ml-auto text-ink-soft/70">Click any province to view country</span>
      </div>
    </div>
  );
}
