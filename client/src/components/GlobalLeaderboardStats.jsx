import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { getGlobalLeaderboardStatsLocal } from '../lib/queries';
import { visitorOpacity } from '../lib/globalStats';
import { GEO_URL, getAlpha2 } from '../lib/geo';
import { countryFlag as flag } from '../lib/flag';

function CountryList({ title, countries, footnote }) {
  return (
    <div className="bg-panel border border-hairline rounded-lg p-4">
      <h3 className="smallcaps text-ink-soft mb-3">{title}</h3>
      <ol className="space-y-1.5">
        {countries.map((c, i) => (
          <li key={c.code} className="flex items-center justify-between text-sm">
            <span className="text-ink truncate">
              <span className="text-ink-soft tabular-nums mr-2">{i + 1}.</span>
              {flag(c.code)} {c.name}
            </span>
            <span className="text-ink-soft tabular-nums shrink-0 ml-2">
              {c.visitors} {c.visitors === 1 ? 'traveller' : 'travellers'}
            </span>
          </li>
        ))}
      </ol>
      {footnote && <p className="text-xs text-ink-soft/70 mt-2">{footnote}</p>}
    </div>
  );
}

// Mini section at the bottom of the main leaderboard (issue #67): most/least
// logged countries, a choropleth of visitor counts, and the continent
// leaderboard. Fails quietly (renders nothing) rather than showing an error —
// this is bonus community colour, not core leaderboard functionality.
export default function GlobalLeaderboardStats({ db }) {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getGlobalLeaderboardStatsLocal(db);
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [db]);

  if (failed || !stats) return null;

  const { mostVisited, leastVisited, moreZeroCount, visitorsByCountry, maxVisitors, continents } = stats;

  function getFill(geo) {
    const code = getAlpha2(geo);
    const opacity = visitorOpacity(visitorsByCountry[code] || 0, maxVisitors);
    if (opacity === 0) return 'var(--color-parchment)';
    return `color-mix(in srgb, var(--color-atlas) ${Math.round(opacity * 100)}%, var(--color-parchment))`;
  }

  function handleCountryEnter(geo) {
    const code = getAlpha2(geo);
    const count = visitorsByCountry[code] || 0;
    setTooltip(`${geo.properties.name} — ${count} ${count === 1 ? 'traveller' : 'travellers'}`);
  }

  return (
    <div className="mt-10">
      <h2 className="font-display font-black text-xl text-ink mb-4">The Community</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <CountryList title="Most logged countries" countries={mostVisited} />
        <CountryList
          title="Least logged countries"
          countries={leastVisited}
          footnote={moreZeroCount > 0 ? `+${moreZeroCount} more untouched` : null}
        />
      </div>

      <div
        className="bg-panel border border-hairline rounded-lg p-4 mb-4"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <h3 className="smallcaps text-ink-soft mb-3">Where everyone&rsquo;s been</h3>
        <div className="relative max-w-xl mx-auto">
          <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 115 }} style={{ width: '100%', height: 'auto' }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => handleCountryEnter(geo)}
                    onMouseLeave={() => setTooltip('')}
                    style={{
                      default: { fill: getFill(geo), stroke: 'var(--color-paper)', strokeWidth: 0.4, outline: 'none' },
                      hover: { fill: getFill(geo), stroke: 'var(--color-ink)', strokeWidth: 0.6, outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
          </ComposableMap>
          {tooltip && (
            <div
              className="fixed bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none z-50"
              style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
            >
              {tooltip}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-ink-soft smallcaps">
          <span>Fewer</span>
          <span className="w-3 h-3 rounded-sm inline-block bg-parchment border border-hairline" />
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'color-mix(in srgb, var(--color-atlas) 45%, var(--color-parchment))' }} />
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'color-mix(in srgb, var(--color-atlas) 75%, var(--color-parchment))' }} />
          <span className="w-3 h-3 rounded-sm inline-block bg-atlas" />
          <span>More</span>
        </div>
      </div>

      <div className="bg-panel border border-hairline rounded-lg p-4">
        <h3 className="smallcaps text-ink-soft mb-3">Continent leaderboard</h3>
        <ol className="space-y-2">
          {continents.map((c, i) => (
            <li key={c.continent} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                <span className="text-ink-soft tabular-nums mr-2">{i + 1}.</span>
                {c.continent}
              </span>
              <span className="text-right">
                <span className="font-display font-black text-ink tabular-nums">
                  {c.points.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts
                </span>
                <span className="text-ink-soft text-xs ml-2">
                  {c.countriesLogged} {c.countriesLogged === 1 ? 'country' : 'countries'} logged
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
