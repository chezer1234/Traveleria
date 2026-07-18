import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, Graticule, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { publicName } from '../lib/names';
import { useTheme } from '../context/ThemeContext';
import DotMatrixLayer from '../components/DotMatrixLayer';
import {
  getUserCountriesLocal,
  getUserDaysByCountry,
  getUserPublicLocal,
} from '../lib/queries';
import { computeTerritory, OWNER, fadeColour, gradeOpacity } from '../lib/territory';
import { GEO_URL, getAlpha2 } from '../lib/geo';
import CountryLink from '../components/CountryLink';
import { countryFlag as flag } from '../lib/flag';

// Battle palette via theme tokens (issue #60) — each style maps you/them/
// contested to its own CVD-validated colours (see docs/designs/README.md).
// Hovers deepen the fill toward ink, which flips to a lighten on dark themes.
const BASE_COLORS = {
  [OWNER.A]: { hex: 'var(--color-you)', hover: 'color-mix(in srgb, var(--color-you) 78%, var(--color-ink))' },
  [OWNER.B]: { hex: 'var(--color-them)', hover: 'color-mix(in srgb, var(--color-them) 78%, var(--color-ink))' },
  [OWNER.CONTESTED]: { hex: 'var(--color-contested)', hover: 'color-mix(in srgb, var(--color-contested) 78%, var(--color-ink))' },
  [OWNER.NONE]: { hex: 'var(--color-parchment)', hover: 'var(--color-parchment-deep)' },
};
// Kept for non-gradient uses (key, chips, bar).
const COLORS = {
  [OWNER.A]: { fill: BASE_COLORS[OWNER.A].hex, hover: BASE_COLORS[OWNER.A].hover },
  [OWNER.B]: { fill: BASE_COLORS[OWNER.B].hex, hover: BASE_COLORS[OWNER.B].hover },
  [OWNER.CONTESTED]: { fill: BASE_COLORS[OWNER.CONTESTED].hex, hover: BASE_COLORS[OWNER.CONTESTED].hover },
  [OWNER.NONE]: { fill: BASE_COLORS[OWNER.NONE].hex, hover: BASE_COLORS[OWNER.NONE].hover },
};

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function Territory() {
  const { userId: opponentId } = useParams();
  const { user, db, dbStatus } = useAuth();
  const { def: themeDef } = useTheme();
  // Dot-matrix render mode (issue #63) — the battle map reuses Orbit's dot
  // grid with ownership colours, exactly like the concept's page 3.
  const dotMode = !!themeDef.map?.dots;

  const [opponent, setOpponent] = useState(null);
  const [you, setYou] = useState({ countries: [], days: {} });
  const [them, setThem] = useState({ countries: [], days: {} });
  const [mode, setMode] = useState('time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const isSelf = opponentId === user.id;

  const load = useCallback(async () => {
    if (!db || isSelf) return;
    setLoading(true);
    setError('');
    try {
      const opp = await getUserPublicLocal(db, opponentId);
      if (!opp) {
        setError('That traveller could not be found.');
        return;
      }
      const [yourCountries, yourDays, theirCountries, theirDays] = await Promise.all([
        getUserCountriesLocal(db, user.id, user.home_country),
        getUserDaysByCountry(db, user.id),
        getUserCountriesLocal(db, opp.id, opp.home_country),
        getUserDaysByCountry(db, opp.id),
      ]);
      setOpponent(opp);
      setYou({ countries: yourCountries, days: yourDays });
      setThem({ countries: theirCountries, days: theirDays });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, opponentId, user.id, user.home_country, isSelf]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  const result = useMemo(() => computeTerritory(you, them, mode), [you, them, mode]);

  // Tug-of-war animation: a single 0→1 eased tween drives both the bar pull
  // (from a neutral 50/50 out to the real split) and the count-up of each score.
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
    let startTs = null;
    const DURATION = 900;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / DURATION);
      setProgress(ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [result]);

  const handleMouseMove = useCallback((e) => setMousePos({ x: e.clientX, y: e.clientY }), []);

  const youName = 'You';
  const themName = publicName(opponent) !== '?' ? publicName(opponent) : 'Opponent';

  function getFill(geo) {
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code] || OWNER.NONE;
    if (owner === OWNER.A || owner === OWNER.B) {
      const grade = result.gradeByCode[code] || 'full';
      return fadeColour(BASE_COLORS[owner].hex, gradeOpacity(grade));
    }
    return COLORS[owner].fill;
  }
  function getHoverFill(geo) {
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code] || OWNER.NONE;
    return BASE_COLORS[owner].hover;
  }
  function dotStateFor(geo) {
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code] || OWNER.NONE;
    if (owner === OWNER.A) return 'you';
    if (owner === OWNER.B) return 'them';
    if (owner === OWNER.CONTESTED) return 'contested';
    return 'none';
  }
  function handleEnter(geo) {
    const code = getAlpha2(geo);
    const name = geo.properties.name;
    const c = result.perCountry.find((x) => x.country_code === code);
    if (!c) { setTooltip(name || ''); return; }
    const metric = mode === 'time'
      ? `${youName} ${c.aDays}d vs ${themName} ${c.bDays}d`
      : `${youName} ${fmt(c.aPoints)} vs ${themName} ${fmt(c.bPoints)} pts`;
    const label = c.owner === OWNER.A ? `${youName} owns` :
      c.owner === OWNER.B ? `${themName} owns` :
      c.owner === OWNER.CONTESTED ? 'Contested' : '';
    setTooltip(`${name} — ${label} · ${metric}`);
  }

  if (isSelf) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-ink-soft">You can't battle yourself! Pick another traveller from the leaderboard.</p>
        <Link to="/leaderboard" className="smallcaps text-compass hover:text-compass-deep mt-4 inline-block">← Back to Leaderboard</Link>
      </div>
    );
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-ink-soft">Loading battle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">{error}</div>
        <Link to="/leaderboard" className="smallcaps text-compass hover:text-compass-deep mt-4 inline-block">← Back to Leaderboard</Link>
      </div>
    );
  }

  // Animated values: bar pulls from 50/50 toward the real split; scores count up.
  const barA = 50 + (result.percentA - 50) * progress;
  const dispScoreA = result.scoreA * progress;
  const dispScoreB = result.scoreB * progress;
  const dispPctA = 50 + (result.percentA - 50) * progress;
  const dispPctB = 100 - dispPctA;

  const youWins = result.winner === OWNER.A;
  const themWins = result.winner === OWNER.B;
  const noTerritory = result.scoreA === 0 && result.scoreB === 0;

  const contested = result.perCountry.filter((c) => c.owner === OWNER.CONTESTED);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/leaderboard" className="smallcaps text-compass hover:text-compass-deep mb-4 inline-block">
        ← Back to Leaderboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">
            Territory Battle — {youName} vs {themName} {flag(opponent?.home_country)}
          </h1>
          <p className="smallcaps text-ink-soft mt-1.5">
            Just for fun — battles never change anyone's Travel Points.
          </p>
        </div>

        {/* Time / Points tabs */}
        <div className="flex gap-1 bg-panel border border-hairline rounded-md p-1 self-start">
          {['time', 'points'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded smallcaps transition-colors ${
                mode === m ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {m === 'time' ? 'Time battle' : 'Points battle'}
            </button>
          ))}
        </div>
      </div>

      {/* Tug-of-war */}
      <div className="plate rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <div className="smallcaps text-ink-soft flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-ink/20" style={{ background: COLORS[OWNER.A].fill }} />
              {youName} {youWins && !noTerritory && <span title="Winning">🏆</span>}
            </div>
            <p className="font-display font-black tabular-nums text-2xl sm:text-4xl text-ink">
              {fmt(dispScoreA)} <span className="text-sm font-bold text-ink-soft">pts</span>
            </p>
          </div>
          <div className="text-right">
            <div className="smallcaps text-ink-soft flex items-center justify-end gap-1.5">
              {themWins && !noTerritory && <span title="Winning">🏆</span>} {themName}
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-ink/20" style={{ background: COLORS[OWNER.B].fill }} />
            </div>
            <p className="font-display font-black tabular-nums text-2xl sm:text-4xl text-ink">
              {fmt(dispScoreB)} <span className="text-sm font-bold text-ink-soft">pts</span>
            </p>
          </div>
        </div>

        <div className="relative h-2.5 select-none" aria-hidden="true">
          {/* 2px paper gap between the two segments at the split */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-compass"
            style={{ width: `calc(${barA}% - 1px)` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-sienna"
            style={{ width: `calc(${100 - barA}% - 1px)` }}
          />
          {/* Centre hairline tick */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 -bottom-1.5 w-px bg-hairline" />
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <span className="smallcaps text-ink-soft tabular-nums">{Math.round(dispPctA)}%</span>
          <span className="text-sm text-ink text-center">
            {noTerritory
              ? 'No territory yet — add countries and time to start the battle'
              : youWins ? `${youName} ${result.percentA >= 60 ? 'dominating' : 'ahead'}!`
              : themWins ? `${themName} ${result.percentB >= 60 ? 'dominating' : 'ahead'}!`
              : 'Dead heat!'}
          </span>
          <span className="smallcaps text-ink-soft tabular-nums">{Math.round(dispPctB)}%</span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <SummaryChip label={`${youName} own`} value={result.perCountry.filter((c) => c.owner === OWNER.A).length} tone="bg-compass/10 border-compass/40" />
        <SummaryChip label="Contested" value={result.contestedCount} tone="bg-plum/10 border-plum/40" />
        <SummaryChip label={`${themName} own`} value={result.perCountry.filter((c) => c.owner === OWNER.B).length} tone="bg-sienna/10 border-sienna/40" />
      </div>

      {/* Map */}
      <div className="plate rounded-lg relative" onMouseMove={handleMouseMove}>
        <div className="px-4 pt-4 pb-3 text-center border-b border-hairline">
          <p className="font-display font-bold text-ink uppercase tracking-[0.18em] text-sm sm:text-base">
            Plate Nº III — The Great Game
          </p>
          <p className="smallcaps text-ink-soft mt-1">
            Two expeditions, one map · claims by {mode === 'time' ? 'days' : 'points'} per country
          </p>
        </div>
        <div className="p-2 sm:p-4">
          <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }} style={{ width: '100%', height: 'auto' }}>
            <ZoomableGroup>
              {dotMode && <Graticule step={[20, 20]} className="grat" />}
              <Geographies geography={GEO_URL}>
                {({ geographies, path, projection }) => (
                  <>
                    {dotMode && (
                      <DotMatrixLayer
                        geographies={geographies}
                        path={path}
                        projection={projection}
                        stateFor={dotStateFor}
                      />
                    )}
                    {geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => handleEnter(geo)}
                        onMouseLeave={() => setTooltip('')}
                        style={
                          dotMode
                            ? {
                                default: { fill: 'transparent', stroke: 'none', outline: 'none' },
                                hover: {
                                  fill: 'color-mix(in srgb, var(--color-compass) 12%, transparent)',
                                  stroke: 'none',
                                  outline: 'none',
                                  cursor: 'pointer',
                                },
                                pressed: { outline: 'none' },
                              }
                            : {
                                default: { fill: getFill(geo), stroke: 'var(--color-paper)', strokeWidth: 0.5, outline: 'none' },
                                hover: { fill: getHoverFill(geo), stroke: 'var(--color-paper)', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                                pressed: { outline: 'none' },
                              }
                        }
                      />
                    ))}
                  </>
                )}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {tooltip && (
          <div
            className="fixed bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none z-50"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Key */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-ink-soft">
        <KeyItem color={COLORS[OWNER.A].fill} label={`${youName} own`} />
        <KeyItem color={COLORS[OWNER.B].fill} label={`${themName} own`} />
        <KeyItem color={COLORS[OWNER.CONTESTED].fill} label="Contested (equal)" />
        <KeyItem color={COLORS[OWNER.NONE].fill} label="Neither visited" />
      </div>

      {/* Contested battlegrounds */}
      {contested.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-bold text-lg text-ink mb-3">
            Contested battlegrounds ({contested.length})
          </h2>
          <p className="text-sm text-ink-soft mb-3">
            You've both been to these and are dead even on {mode === 'time' ? 'days spent' : 'points'} — nobody owns them.
          </p>
          <div className="flex flex-wrap gap-2">
            {contested.map((c) => (
              <CountryLink
                key={c.country_code}
                code={c.country_code}
                name={c.country_name}
                className="px-3 py-1.5 rounded-full text-sm text-ink bg-plum/10 border border-plum/40 hover:border-plum hover:text-compass"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label, value, tone }) {
  return (
    <div className={`rounded-lg border px-2 sm:px-4 py-3 text-center ${tone}`}>
      <p className="font-display font-black tabular-nums text-xl sm:text-2xl text-ink">{value}</p>
      <p className="smallcaps text-ink-soft mt-0.5">{label}</p>
    </div>
  );
}

function KeyItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm inline-block border border-ink/20" style={{ background: color }} />
      {label}
    </div>
  );
}
