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

// Atlas battle palette (CVD-validated on paper — see the visual refresh guide).
// You = compass blue, opponent = sienna, contested = plum, unvisited = parchment.
const BASE_COLORS = {
  [OWNER.A]: { hex: '#2e5fa3', hover: '#244b82' },
  [OWNER.B]: { hex: '#b4552d', hover: '#93431f' },
  [OWNER.CONTESTED]: { hex: '#7b4a8f', hover: '#633a74' },
  [OWNER.NONE]: { hex: '#e4dccb', hover: '#d3c7ad' },
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
        <p className="text-ink-soft">You can't battle yourself! Pick another traveller who's also visited this country.</p>
        <Link to={`/countries/${countryCode}`} className="smallcaps text-compass hover:text-compass-deep mt-4 inline-block">← Back to country</Link>
      </div>
    );
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-ink-soft">Loading state battle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">{error}</div>
        <Link to={`/countries/${countryCode}`} className="smallcaps text-compass hover:text-compass-deep mt-4 inline-block">← Back to country</Link>
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
      <Link to={`/countries/${country.code}`} className="smallcaps text-compass hover:text-compass-deep mb-4 inline-block">
        ← Back to country
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">
            State Battle — {country.code}: {youName} vs {themName}
          </h1>
          <p className="smallcaps text-ink-soft mt-1.5">
            Just for fun — battles never change anyone's Travel Points.
          </p>
        </div>

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
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-ink/20" style={{ background: BASE_COLORS[OWNER.A].hex }} />
              {youName} {youWins && !noTerritory && <span title="Winning">🏆</span>}
            </div>
            <p className="font-display font-black tabular-nums text-2xl sm:text-4xl text-ink">
              {fmt(dispScoreA)} <span className="text-sm font-bold text-ink-soft">pts</span>
            </p>
          </div>
          <div className="text-right">
            <div className="smallcaps text-ink-soft flex items-center justify-end gap-1.5">
              {themWins && !noTerritory && <span title="Winning">🏆</span>} {themName}
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-ink/20" style={{ background: BASE_COLORS[OWNER.B].hex }} />
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
              ? 'No shared states yet — visit some states to start the battle'
              : youWins ? `${youName} ${result.percentA >= 60 ? 'dominating' : 'ahead'}!`
              : themWins ? `${themName} ${result.percentB >= 60 ? 'dominating' : 'ahead'}!`
              : 'Dead heat!'}
          </span>
          <span className="smallcaps text-ink-soft tabular-nums">{Math.round(dispPctB)}%</span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <SummaryChip label={`${youName} own`} value={result.perProvince.filter((p) => p.owner === OWNER.A).length} tone="bg-compass/10 border-compass/40" />
        <SummaryChip label="Contested" value={result.contestedCount} tone="bg-plum/10 border-plum/40" />
        <SummaryChip label={`${themName} own`} value={result.perProvince.filter((p) => p.owner === OWNER.B).length} tone="bg-sienna/10 border-sienna/40" />
      </div>

      {/* Map — read-only ownership colouring */}
      <div className="plate rounded-lg">
        <div className="px-4 pt-4 pb-3 text-center border-b border-hairline">
          <p className="font-display font-bold text-ink uppercase tracking-[0.18em] text-sm sm:text-base">
            Plate — The {country.code} Front
          </p>
          <p className="smallcaps text-ink-soft mt-1">
            State by state · claims by {mode === 'time' ? 'days' : 'points'} per state
          </p>
        </div>
        <div className="p-2 sm:p-4">
          <ProvinceMap
            countryCode={country.code}
            provinces={provinceMapData}
            visitedCodes={new Set()}
            onToggle={() => {}}
            disabled
            getFill={getFill}
            getTooltip={getTooltip}
            legend={
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-ink-soft px-1">
                <KeyItem color={BASE_COLORS[OWNER.A].hex} label={`${youName} own`} />
                <KeyItem color={BASE_COLORS[OWNER.B].hex} label={`${themName} own`} />
                <KeyItem color={BASE_COLORS[OWNER.CONTESTED].hex} label="Contested (equal)" />
                <KeyItem color={BASE_COLORS[OWNER.NONE].hex} label="Neither visited" />
              </div>
            }
          />
        </div>
      </div>

      {/* Contested battlegrounds */}
      {contested.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-bold text-lg text-ink mb-3">
            Contested states ({contested.length})
          </h2>
          <p className="text-sm text-ink-soft mb-3">
            You've both been to these and are dead even on {mode === 'time' ? 'days spent' : 'points'} — nobody owns them.
          </p>
          <div className="flex flex-wrap gap-2">
            {contested.map((p) => (
              <span key={p.province_code} className="px-3 py-1.5 rounded-full text-sm text-ink bg-plum/10 border border-plum/40">
                {p.province_name}
              </span>
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
