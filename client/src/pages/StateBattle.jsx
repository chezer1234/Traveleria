// State/province battle (issue #46 Phase 2) — same tug-of-war/map pattern as
// the country-level Territory page (issue #29), scoped to one Tier 0
// country's states/provinces. Only offered between two users who've both
// visited the country (enforced by the opponent picker on CountryDetail).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getUserPublicLocal,
  getUserCountryScoreLocal,
  getUserDaysByProvince,
} from '../lib/queries';
import { computeProvinceTerritory } from '../lib/provinceTerritory.js';
import { OWNER, hexToRgba, gradeOpacity } from '../lib/territory.js';
import ProvinceMap from '../components/ProvinceMap';

const BASE_COLORS = {
  [OWNER.A]: { hex: '#3b82f6', hover: '#2563eb' },
  [OWNER.B]: { hex: '#ef4444', hover: '#dc2626' },
  [OWNER.CONTESTED]: { hex: '#a855f7', hover: '#9333ea' },
  [OWNER.NONE]: { hex: '#d1d5db', hover: '#9ca3af' },
};

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function StateBattle() {
  const { userId: opponentId, countryCode } = useParams();
  const { user, db, dbStatus } = useAuth();

  const [country, setCountry] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [you, setYou] = useState({ provinceBreakdown: [], days: {} });
  const [them, setThem] = useState({ provinceBreakdown: [], days: {} });
  const [mode, setMode] = useState('time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const [yourScore, theirScore] = await Promise.all([
        getUserCountryScoreLocal(db, user.id, countryCode, user.home_country),
        getUserCountryScoreLocal(db, opp.id, countryCode, opp.home_country),
      ]);
      if (!yourScore || yourScore.tier !== 0) {
        setError('State battles are only available for Tier 0 nations.');
        return;
      }
      const provinceCodes = (yourScore.provinceBreakdown || []).map((p) => p.code);
      const [yourDays, theirDays] = await Promise.all([
        getUserDaysByProvince(db, user.id, provinceCodes),
        getUserDaysByProvince(db, opp.id, provinceCodes),
      ]);
      setCountry({ code: countryCode.toUpperCase() });
      setOpponent(opp);
      setYou({ provinceBreakdown: yourScore.provinceBreakdown, days: yourDays });
      setThem({ provinceBreakdown: theirScore?.provinceBreakdown || [], days: theirDays });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, opponentId, countryCode, user.id, user.home_country, isSelf]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  const result = useMemo(() => computeProvinceTerritory(you, them, mode), [you, them, mode]);

  // Same tug-of-war tween as the country-level Territory page.
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

  const youName = 'You';
  const themName = opponent?.identifier || 'Opponent';

  const provinceMapData = useMemo(
    () => you.provinceBreakdown.map((p) => ({ code: p.code, name: p.name })),
    [you.provinceBreakdown],
  );

  function getFill(code) {
    const owner = result.ownerByCode[code] || OWNER.NONE;
    if (owner === OWNER.A || owner === OWNER.B) {
      const grade = result.gradeByCode[code] || 'full';
      return hexToRgba(BASE_COLORS[owner].hex, gradeOpacity(grade));
    }
    return BASE_COLORS[owner].hex;
  }

  function getTooltip(code, province) {
    const p = result.perProvince.find((x) => x.province_code === code);
    if (!p) return { name: province.name, lines: ['Neither traveller has visited'] };
    const label = p.owner === OWNER.A ? `${youName} owns` :
      p.owner === OWNER.B ? `${themName} owns` :
      p.owner === OWNER.CONTESTED ? 'Contested' : 'Neither visited';
    const metric = mode === 'time'
      ? `${youName} ${p.aDays}d vs ${themName} ${p.bDays}d`
      : `${youName} ${fmt(p.aPoints)} vs ${themName} ${fmt(p.bPoints)} pts`;
    return { name: province.name, lines: [label, metric] };
  }

  if (isSelf) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">You can't battle yourself! Pick another traveller who's also visited this country.</p>
        <Link to={`/countries/${countryCode}`} className="text-indigo-600 hover:underline mt-4 inline-block">← Back to country</Link>
      </div>
    );
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-gray-500">Loading state battle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        <Link to={`/countries/${countryCode}`} className="text-indigo-600 hover:underline mt-4 inline-block">← Back to country</Link>
      </div>
    );
  }

  const barA = 50 + (result.percentA - 50) * progress;
  const dispScoreA = result.scoreA * progress;
  const dispScoreB = result.scoreB * progress;
  const dispPctA = 50 + (result.percentA - 50) * progress;
  const dispPctB = 100 - dispPctA;
  const youWins = result.winner === OWNER.A;
  const themWins = result.winner === OWNER.B;
  const noTerritory = result.scoreA === 0 && result.scoreB === 0;
  const contested = result.perProvince.filter((p) => p.owner === OWNER.CONTESTED);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to={`/countries/${country.code}`} className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        ← Back to country
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">State Battle — {country.code}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {youName} <span className="text-gray-400">vs</span>{' '}
            <span className="font-medium text-gray-700">{themName}</span>
            <span className="block text-xs text-gray-400 mt-0.5">
              Just for fun — this never affects anyone's Travel Points.
            </span>
          </p>
        </div>

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
          <div className="flex items-center gap-2 font-medium" style={{ color: BASE_COLORS[OWNER.A].hex }}>
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: BASE_COLORS[OWNER.A].hex }} />
            {youName} {youWins && !noTerritory && <span title="Winning">🏆</span>}
          </div>
          <div className="flex items-center gap-2 font-medium" style={{ color: BASE_COLORS[OWNER.B].hex }}>
            {themName} {themWins && !noTerritory && <span title="Winning">🏆</span>}
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: BASE_COLORS[OWNER.B].hex }} />
          </div>
        </div>

        <div className="relative h-9 rounded-full overflow-hidden flex select-none" aria-hidden="true">
          <div
            className="h-full flex items-center justify-start pl-3 text-white text-sm font-bold tabular-nums"
            style={{ width: `${barA}%`, background: BASE_COLORS[OWNER.A].hex }}
          >
            {dispPctA >= 12 && `${Math.round(dispPctA)}%`}
          </div>
          <div
            className="h-full flex items-center justify-end pr-3 text-white text-sm font-bold tabular-nums"
            style={{ width: `${100 - barA}%`, background: BASE_COLORS[OWNER.B].hex }}
          >
            {dispPctB >= 12 && `${Math.round(dispPctB)}%`}
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow" style={{ left: `${barA}%` }} />
        </div>

        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="font-semibold tabular-nums" style={{ color: BASE_COLORS[OWNER.A].hex }}>
            {fmt(dispScoreA)} pts
          </span>
          <span className="text-gray-400 text-xs">
            {noTerritory
              ? 'No shared states yet — visit some states to start the battle'
              : youWins ? `${youName} ${result.percentA >= 60 ? 'dominating' : 'ahead'}!`
              : themWins ? `${themName} ${result.percentB >= 60 ? 'dominating' : 'ahead'}!`
              : 'Dead heat!'}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: BASE_COLORS[OWNER.B].hex }}>
            {fmt(dispScoreB)} pts
          </span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryChip label={`${youName} own`} value={result.perProvince.filter((p) => p.owner === OWNER.A).length} color={BASE_COLORS[OWNER.A].hex} />
        <SummaryChip label="Contested" value={result.contestedCount} color={BASE_COLORS[OWNER.CONTESTED].hex} />
        <SummaryChip label={`${themName} own`} value={result.perProvince.filter((p) => p.owner === OWNER.B).length} color={BASE_COLORS[OWNER.B].hex} />
      </div>

      {/* Map — read-only ownership colouring */}
      <ProvinceMap
        countryCode={country.code}
        provinces={provinceMapData}
        visitedCodes={new Set()}
        onToggle={() => {}}
        disabled
        getFill={getFill}
        getTooltip={getTooltip}
        legend={
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600 px-1">
            <KeyItem color={BASE_COLORS[OWNER.A].hex} label={`${youName} own`} />
            <KeyItem color={BASE_COLORS[OWNER.B].hex} label={`${themName} own`} />
            <KeyItem color={BASE_COLORS[OWNER.CONTESTED].hex} label="Contested (equal)" />
            <KeyItem color={BASE_COLORS[OWNER.NONE].hex} label="Neither visited" />
          </div>
        }
      />

      {/* Contested battlegrounds */}
      {contested.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Contested states ({contested.length})
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            You've both been to these and are dead even on {mode === 'time' ? 'days spent' : 'points'} — nobody owns them.
          </p>
          <div className="flex flex-wrap gap-2">
            {contested.map((p) => (
              <span key={p.province_code} className="px-3 py-1.5 rounded-full text-sm border" style={{ borderColor: BASE_COLORS[OWNER.CONTESTED].hex, color: BASE_COLORS[OWNER.CONTESTED].hex }}>
                {p.province_name}
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
