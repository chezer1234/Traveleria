import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import {
  getUserCountriesLocal,
  getUserDaysByCountry,
  getUserPublicLocal,
} from '../lib/queries';
import { computeTerritory, OWNER, hexToRgba, gradeOpacity } from '../lib/territory';
import { GEO_URL, getAlpha2 } from '../lib/geo';

// Battle colours. You = blue, opponent = red, contested = purple, unvisited = grey.
const BASE_COLORS = {
  [OWNER.A]: { hex: '#3b82f6', hover: '#2563eb' },
  [OWNER.B]: { hex: '#ef4444', hover: '#dc2626' },
  [OWNER.CONTESTED]: { hex: '#a855f7', hover: '#9333ea' },
  [OWNER.NONE]: { hex: '#d1d5db', hover: '#9ca3af' },
};
// Kept for non-gradient uses (key, chips, bar).
const COLORS = {
  [OWNER.A]: { fill: BASE_COLORS[OWNER.A].hex, hover: BASE_COLORS[OWNER.A].hover },
  [OWNER.B]: { fill: BASE_COLORS[OWNER.B].hex, hover: BASE_COLORS[OWNER.B].hover },
  [OWNER.CONTESTED]: { fill: BASE_COLORS[OWNER.CONTESTED].hex, hover: BASE_COLORS[OWNER.CONTESTED].hover },
  [OWNER.NONE]: { fill: BASE_COLORS[OWNER.NONE].hex, hover: BASE_COLORS[OWNER.NONE].hover },
};

const flag = (code) =>
  code ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function Territory() {
  const { userId: opponentId } = useParams();
  const { user, db, dbStatus } = useAuth();

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
  const themName = opponent?.identifier || 'Opponent';

  function getFill(geo) {
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code] || OWNER.NONE;
    if (owner === OWNER.A || owner === OWNER.B) {
      const grade = result.gradeByCode[code] || 'full';
      return hexToRgba(BASE_COLORS[owner].hex, gradeOpacity(grade));
    }
    return COLORS[owner].fill;
  }
  function getHoverFill(geo) {
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code] || OWNER.NONE;
    return BASE_COLORS[owner].hover;
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
        <p className="text-gray-600">You can't battle yourself! Pick another traveller from the leaderboard.</p>
        <Link to="/leaderboard" className="text-indigo-600 hover:underline mt-4 inline-block">← Back to Leaderboard</Link>
      </div>
    );
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-gray-500">Loading battle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        <Link to="/leaderboard" className="text-indigo-600 hover:underline mt-4 inline-block">← Back to Leaderboard</Link>
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
      <Link to="/leaderboard" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        ← Back to Leaderboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Territory Battle</h1>
          <p className="text-sm text-gray-500 mt-1">
            {youName} <span className="text-gray-400">vs</span>{' '}
            <span className="font-medium text-gray-700">{themName}</span>{' '}
            {flag(opponent?.home_country)}
            <span className="block text-xs text-gray-400 mt-0.5">
              Just for fun — this never affects anyone's Travel Points.
            </span>
          </p>
        </div>

        {/* Time / Points tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start">
          {['time', 'points'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {m === 'time' ? 'Time battle' : 'Points battle'}
            </button>
          ))}
        </div>
      </div>

      {/* Tug-of-war bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="flex items-center gap-2 font-medium" style={{ color: COLORS[OWNER.A].fill }}>
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COLORS[OWNER.A].fill }} />
            {youName} {youWins && !noTerritory && <span title="Winning">🏆</span>}
          </div>
          <div className="flex items-center gap-2 font-medium" style={{ color: COLORS[OWNER.B].fill }}>
            {themName} {themWins && !noTerritory && <span title="Winning">🏆</span>}
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COLORS[OWNER.B].fill }} />
          </div>
        </div>

        <div className="relative h-9 rounded-full overflow-hidden flex select-none" aria-hidden="true">
          <div
            className="h-full flex items-center justify-start pl-3 text-white text-sm font-bold tabular-nums"
            style={{ width: `${barA}%`, background: COLORS[OWNER.A].fill }}
          >
            {dispPctA >= 12 && `${Math.round(dispPctA)}%`}
          </div>
          <div
            className="h-full flex items-center justify-end pr-3 text-white text-sm font-bold tabular-nums"
            style={{ width: `${100 - barA}%`, background: COLORS[OWNER.B].fill }}
          >
            {dispPctB >= 12 && `${Math.round(dispPctB)}%`}
          </div>
          {/* Centre rope-pull marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow"
            style={{ left: `${barA}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="font-semibold tabular-nums" style={{ color: COLORS[OWNER.A].fill }}>
            {fmt(dispScoreA)} pts
          </span>
          <span className="text-gray-400 text-xs">
            {noTerritory
              ? 'No territory yet — add countries and time to start the battle'
              : youWins ? `${youName} ${result.percentA >= 60 ? 'dominating' : 'ahead'}!`
              : themWins ? `${themName} ${result.percentB >= 60 ? 'dominating' : 'ahead'}!`
              : 'Dead heat!'}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: COLORS[OWNER.B].fill }}>
            {fmt(dispScoreB)} pts
          </span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryChip label={`${youName} own`} value={result.perCountry.filter((c) => c.owner === OWNER.A).length} color={COLORS[OWNER.A].fill} />
        <SummaryChip label="Contested" value={result.contestedCount} color={COLORS[OWNER.CONTESTED].fill} />
        <SummaryChip label={`${themName} own`} value={result.perCountry.filter((c) => c.owner === OWNER.B).length} color={COLORS[OWNER.B].fill} />
      </div>

      {/* Map */}
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4 relative"
        onMouseMove={handleMouseMove}
      >
        <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }} style={{ width: '100%', height: 'auto' }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => handleEnter(geo)}
                    onMouseLeave={() => setTooltip('')}
                    style={{
                      default: { fill: getFill(geo), stroke: '#fff', strokeWidth: 0.5, outline: 'none' },
                      hover: { fill: getHoverFill(geo), stroke: '#fff', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div
            className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-50"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Key */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
        <KeyItem color={COLORS[OWNER.A].fill} label={`${youName} own`} />
        <KeyItem color={COLORS[OWNER.B].fill} label={`${themName} own`} />
        <KeyItem color={COLORS[OWNER.CONTESTED].fill} label="Contested (equal)" />
        <KeyItem color={COLORS[OWNER.NONE].fill} label="Neither visited" />
      </div>

      {/* Contested battlegrounds */}
      {contested.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Contested battlegrounds ({contested.length})
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            You've both been to these and are dead even on {mode === 'time' ? 'days spent' : 'points'} — nobody owns them.
          </p>
          <div className="flex flex-wrap gap-2">
            {contested.map((c) => (
              <span key={c.country_code} className="px-3 py-1.5 rounded-full text-sm border" style={{ borderColor: COLORS[OWNER.CONTESTED].fill, color: COLORS[OWNER.CONTESTED].fill }}>
                {c.country_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function KeyItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
      {label}
    </div>
  );
}
