// Stats page's "large map" (issue #75, phase 2): toggles between a
// continent view (a pie badge over each continent — click one to flip it
// from "share of your overall total" to "that continent's own Base vs
// Experience split") and a choropleth of personal points per country.
// Reuses the world-atlas TopoJSON + alpha-2 lookup already shared by
// Map.jsx/Territory.jsx (client/src/lib/geo.js) and the same
// ComposableMap/ZoomableGroup setup as the main World Map page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { GEO_URL, getAlpha2 } from '../lib/geo';
import { pieSliceAngles } from '../lib/continentStats';

// Approximate [lng, lat] centroids — good enough to place a decorative
// badge roughly over the right landmass, not meant to be geographically
// exact. Antarctica is excluded (no subregion mapping — see continents.js).
const CONTINENT_CENTROIDS = {
  Europe: [15, 54],
  Asia: [90, 34],
  Africa: [20, 2],
  'North America': [-100, 45],
  'South America': [-58, -18],
  Oceania: [145, -25],
};

const BASE_COLOUR = 'var(--color-compass)';
const EXPERIENCE_COLOUR = 'var(--color-atlas)'; // same green already means "exploration" on Dashboard's progress bars
const SHARE_COLOUR = 'var(--color-atlas)';
const REST_COLOUR = 'var(--color-parchment-deep)';

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
const pct = (f) => `${Math.round(f * 100)}%`;

function polarPoint(r, angle) {
  // angle: 0 = 12 o'clock, clockwise (matches pieSliceAngles)
  return { x: r * Math.sin(angle), y: -r * Math.cos(angle) };
}

function arcPath(r, startAngle, endAngle) {
  if (endAngle - startAngle >= 2 * Math.PI - 1e-6) {
    // Full circle — a single arc command can't close on itself, draw as two halves.
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  }
  const start = polarPoint(r, startAngle);
  const end = polarPoint(r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M 0 0 L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function PieBadge({ fractions, colours, radius = 16 }) {
  const slices = pieSliceAngles(fractions);
  return (
    <g>
      <circle r={radius + 2} fill="var(--color-panel)" stroke="var(--color-hairline)" strokeWidth={1} />
      {slices.map((s, i) => (
        <path key={i} d={arcPath(radius, s.startAngle, s.endAngle)} fill={s.implicit ? REST_COLOUR : colours[i]} />
      ))}
    </g>
  );
}

export default function ContinentPointsMap({ continentStats }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('continents'); // 'continents' | 'choropleth'
  const [expanded, setExpanded] = useState(null); // continent name showing its Base/Experience split, or null
  // What's hovered, not the tooltip text itself — text is derived at render
  // time from this + the current `expanded`/`continents` state. A static
  // string captured only on hover would go stale the moment a click flips
  // `expanded` without a fresh mouseenter to refresh it.
  const [hovered, setHovered] = useState(null); // { type: 'country', name, points } | { type: 'continent', continent } | null
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { continents, pointsByCountry, maxCountryPoints } = continentStats;

  function getChoroplethFill(geo) {
    const code = getAlpha2(geo);
    const points = pointsByCountry[code] || 0;
    if (points <= 0 || maxCountryPoints <= 0) return 'var(--color-parchment)';
    const opacity = Math.max(0.12, points / maxCountryPoints);
    return `color-mix(in srgb, var(--color-compass) ${Math.round(opacity * 100)}%, var(--color-parchment))`;
  }

  let tooltip = '';
  if (hovered?.type === 'country') {
    tooltip = `${hovered.name} — ${fmt(hovered.points)} pts`;
  } else if (hovered?.type === 'continent') {
    const c = continents.find((x) => x.continent === hovered.continent);
    if (c) {
      tooltip = expanded === hovered.continent
        ? `${c.continent} — Base ${fmt(c.base)} · Experience ${fmt(c.experience)}`
        : `${c.continent} — ${fmt(c.points)} pts (${pct(c.share)} of your total)`;
    }
  }

  return (
    <div className="plate rounded-lg relative" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 pt-4 pb-3 border-b border-hairline">
        <div>
          <p className="font-display font-bold text-ink">Where your points come from</p>
          <p className="smallcaps text-ink-soft mt-0.5">
            {mode === 'continents' ? 'Tap a continent to see its Base vs Experience split' : 'Points per country'}
          </p>
        </div>
        <div className="flex gap-1 bg-panel border border-hairline rounded-md p-1 shrink-0">
          {[
            { key: 'continents', label: 'By Continent' },
            { key: 'choropleth', label: 'By Country' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setExpanded(null); }}
              aria-pressed={mode === key}
              className={`px-3 py-2 rounded-md smallcaps transition-colors ${
                mode === key ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 sm:p-4">
        <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }} style={{ width: '100%', height: 'auto' }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={mode === 'choropleth' ? () => {
                      const code = getAlpha2(geo);
                      if (code) navigate(`/countries/${code}`);
                    } : undefined}
                    onMouseEnter={mode === 'choropleth' ? () => {
                      const code = getAlpha2(geo);
                      setHovered({ type: 'country', name: geo.properties.name, points: pointsByCountry[code] || 0 });
                    } : undefined}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      default: {
                        fill: mode === 'choropleth' ? getChoroplethFill(geo) : 'var(--color-parchment)',
                        stroke: 'var(--color-paper)',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: mode === 'choropleth' ? getChoroplethFill(geo) : 'var(--color-parchment)',
                        stroke: mode === 'choropleth' ? 'var(--color-ink)' : 'var(--color-paper)',
                        strokeWidth: mode === 'choropleth' ? 0.8 : 0.5,
                        outline: 'none',
                        cursor: mode === 'choropleth' ? 'pointer' : 'default',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {mode === 'continents' && continents.map(({ continent, base, experience, points, share }) => {
              const coords = CONTINENT_CENTROIDS[continent];
              if (!coords) return null;
              const isExpanded = expanded === continent;
              const fractions = isExpanded
                ? (points > 0 ? [base / points, experience / points] : [0, 0])
                : [share];
              const colours = isExpanded ? [BASE_COLOUR, EXPERIENCE_COLOUR] : [SHARE_COLOUR];
              return (
                <Marker
                  key={continent}
                  coordinates={coords}
                  onClick={() => setExpanded(isExpanded ? null : continent)}
                  onMouseEnter={() => setHovered({ type: 'continent', continent })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <PieBadge fractions={fractions} colours={colours} />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div
            className="fixed bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none z-50 max-w-xs"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pb-4 text-xs text-ink-soft smallcaps flex-wrap px-4">
        {mode === 'continents' ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: SHARE_COLOUR }} />
              Share of total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: BASE_COLOUR }} />
              Base (after clicking a continent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: EXPERIENCE_COLOUR }} />
              Experience (after clicking a continent)
            </span>
          </>
        ) : (
          <>
            <span>Fewer points</span>
            <span className="w-3 h-3 rounded-sm inline-block bg-parchment border border-hairline" />
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'color-mix(in srgb, var(--color-compass) 45%, var(--color-parchment))' }} />
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'color-mix(in srgb, var(--color-compass) 75%, var(--color-parchment))' }} />
            <span className="w-3 h-3 rounded-sm inline-block bg-compass" />
            <span>More points</span>
          </>
        )}
      </div>
    </div>
  );
}
