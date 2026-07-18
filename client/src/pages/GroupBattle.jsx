import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { publicName } from '../lib/names';
import { getUserGroupsLocal, getUserCountriesLocal, getUserDaysByCountry } from '../lib/queries';
import { computeGroupTerritory, resolveColours, fadeColour, gradeOpacity } from '../lib/territory';
import { GEO_URL, getAlpha2 } from '../lib/geo';
import { CONTINENTS, getContinent } from '../lib/continents';
import { leaveGroupOptimistic, deleteGroupOptimistic } from '../lib/mutations';
import CountryLink from '../components/CountryLink';
import { countryFlag as flag } from '../lib/flag';

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

// Shared battle states via theme tokens (issue #60). Member colours come from
// resolveColours() and stay user-chosen — only the shared states follow the theme.
const CONTESTED_COLOUR = 'var(--color-contested)';
const CONTESTED_HOVER = 'color-mix(in srgb, var(--color-contested) 78%, var(--color-ink))';
const NONE_COLOUR = 'var(--color-parchment)';
const NONE_HOVER = 'var(--color-parchment-deep)';
const FALLBACK_MEMBER_COLOUR = 'var(--color-ink-soft)';

export default function GroupBattle() {
  const { groupId } = useParams();
  const { user, db, dbStatus } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [sides, setSides] = useState([]);
  const [colourMap, setColourMap] = useState({});
  const [mode, setMode] = useState('time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const groups = await getUserGroupsLocal(db, user.id);
      const g = groups.find((x) => x.id === groupId);
      if (!g) { setError('Group not found or you are not a member.'); setLoading(false); return; }
      setGroup(g);

      // Colour map: resolve conflicts by joined_at order.
      const colours = resolveColours(
        g.members.map((m) => ({ userId: m.user_id, primary_colour: m.primary_colour, secondary_colour: m.secondary_colour })),
      );
      setColourMap(colours);

      // Load each member's travel data in parallel.
      const loadedSides = await Promise.all(
        g.members.map(async (m) => {
          const homeCountry = m.user?.home_country;
          const [countries, days] = await Promise.all([
            getUserCountriesLocal(db, m.user_id, homeCountry),
            getUserDaysByCountry(db, m.user_id),
          ]);
          return { userId: m.user_id, identifier: m.user ? publicName(m.user) : m.user_id, homeCountry, countries, days };
        }),
      );
      setSides(loadedSides);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, groupId, user.id]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  const result = useMemo(() => {
    if (!sides.length) return null;
    return computeGroupTerritory(sides, mode);
  }, [sides, mode]);

  // Animate scores counting up from 0.
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!result) return;
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

  // Map fill: member colour with gradient opacity, contested plum, none parchment.
  function getFill(geo) {
    if (!result) return NONE_COLOUR;
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code];
    if (!owner || owner === 'none') return NONE_COLOUR;
    if (owner === 'contested') return CONTESTED_COLOUR;
    const colour = colourMap[owner] || FALLBACK_MEMBER_COLOUR;
    const grade = result.gradeByCode[code] || 'full';
    return fadeColour(colour, gradeOpacity(grade));
  }

  function getHoverFill(geo) {
    if (!result) return NONE_HOVER;
    const code = getAlpha2(geo);
    const owner = result.ownerByCode[code];
    if (!owner || owner === 'none') return NONE_HOVER;
    if (owner === 'contested') return CONTESTED_HOVER;
    return colourMap[owner] || FALLBACK_MEMBER_COLOUR;
  }

  function handleEnter(geo) {
    if (!result) return;
    const code = getAlpha2(geo);
    const name = geo.properties.name;
    const c = result.perCountry.find((x) => x.country_code === code);
    if (!c) { setTooltip(name || ''); return; }

    const parts = sides.map((s) => {
      const metrics = c.memberMetrics[s.userId];
      const val = mode === 'time' ? `${metrics?.days ?? 0}d` : `${fmt(metrics?.points ?? 0)} pts`;
      return `${s.identifier} ${val}`;
    });
    const ownerLabel = c.owner === 'contested' ? 'Contested' :
      c.owner === 'none' ? '' :
      `${sides.find((s) => s.userId === c.owner)?.identifier ?? '?'} owns`;
    setTooltip(`${name}${ownerLabel ? ` — ${ownerLabel}` : ''} · ${parts.join(' vs ')}`);
  }

  async function handleLeave() {
    if (!confirm(`Leave "${group.name}"?`)) return;
    try {
      await leaveGroupOptimistic(db, groupId, user.id);
      navigate('/groups');
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${group.name}" for everyone?`)) return;
    try {
      await deleteGroupOptimistic(db, groupId);
      navigate('/groups');
    } catch (err) { alert(err.message); }
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-ink-soft">Loading group battle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">{error}</div>
        <Link to="/groups" className="smallcaps text-compass hover:text-compass-deep mt-4 inline-block">← Back to Groups</Link>
      </div>
    );
  }

  const isCreator = group.created_by === user.id;
  const scores = result?.scores || {};
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

  // Sort members by score descending for bar graph display.
  const rankedSides = [...sides].sort((a, b) => (scores[b.userId] || 0) - (scores[a.userId] || 0));

  // Build continent breakdown.
  const continentData = CONTINENTS.map((continent) => {
    const perMember = {};
    let anyScore = false;
    for (const s of sides) {
      let total = 0;
      for (const [subregion, memberScores] of Object.entries(result?.continentScores || {})) {
        if (getContinent(subregion) === continent) {
          total += memberScores[s.userId] || 0;
        }
      }
      perMember[s.userId] = round1(total);
      if (total > 0) anyScore = true;
    }
    return { continent, perMember, anyScore };
  }).filter((d) => d.anyScore);

  const contested = result?.perCountry.filter((c) => c.owner === 'contested') || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" onMouseMove={handleMouseMove}>
      <Link to="/groups" className="smallcaps text-compass hover:text-compass-deep mb-4 inline-block">
        ← Back to Groups
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">{group.name}</h1>
          <p className="smallcaps text-ink-soft mt-1.5">Just for fun — battles never change anyone's Travel Points.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-panel border border-hairline rounded-md p-1">
            {['time', 'points'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded smallcaps transition-colors ${
                  mode === m ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {m === 'time' ? 'Time' : 'Points'}
              </button>
            ))}
          </div>
          {isCreator ? (
            <button onClick={handleDelete} className="px-3 py-2 text-sm text-red-700 border border-red-200 rounded-md hover:bg-red-50">Delete</button>
          ) : (
            <button onClick={handleLeave} className="px-3 py-2 text-sm text-ink-soft border border-hairline rounded-md hover:text-ink hover:bg-panel">Leave</button>
          )}
        </div>
      </div>

      {/* Overall score bar */}
      <div className="plate rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="smallcaps text-ink-soft mb-3">Overall — {mode === 'time' ? 'time' : 'points'} battle</h2>
        <div className="space-y-3">
          {rankedSides.map((s, idx) => {
            const score = round1((scores[s.userId] || 0) * progress);
            const pct = totalScore > 0 ? ((scores[s.userId] || 0) / totalScore) * 100 * progress : 0;
            const colour = colourMap[s.userId] || FALLBACK_MEMBER_COLOUR;
            return (
              <div key={s.userId}>
                <div className="flex items-center justify-between mb-1 text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full border border-ink/20 shrink-0" style={{ background: colour, display: 'inline-block' }} />
                    <span className="font-semibold text-ink truncate">{s.identifier}</span>
                    {s.userId === user.id && <span className="smallcaps text-ink-soft/70">(you)</span>}
                    {idx === 0 && totalScore > 0 && progress > 0.9 && <span title="Leading">🏆</span>}
                    <span>{flag(s.homeCountry)}</span>
                  </div>
                  <span className="font-display font-bold tabular-nums text-ink shrink-0">{fmt(score)} pts</span>
                </div>
                <div className="h-2.5 rounded-full bg-parchment overflow-hidden">
                  <div
                    className="h-full rounded-full transition-none"
                    style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, background: colour }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="plate rounded-lg relative mb-4">
        <div className="px-4 pt-4 pb-3 text-center border-b border-hairline">
          <p className="font-display font-bold text-ink uppercase tracking-[0.18em] text-sm sm:text-base">
            Plate — The Group Game
          </p>
          <p className="smallcaps text-ink-soft mt-1">
            {sides.length} expeditions, one map · claims by {mode === 'time' ? 'days' : 'points'} per country
          </p>
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
                      onMouseEnter={() => handleEnter(geo)}
                      onMouseLeave={() => setTooltip('')}
                      style={{
                        default: { fill: getFill(geo), stroke: 'var(--color-paper)', strokeWidth: 0.5, outline: 'none' },
                        hover: { fill: getHoverFill(geo), stroke: 'var(--color-paper)', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
        {tooltip && (
          <div
            className="fixed bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none z-50 max-w-xs"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Map legend */}
      <div className="flex flex-wrap gap-4 mb-8 text-xs text-ink-soft">
        {sides.map((s) => (
          <div key={s.userId} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-ink/20" style={{ background: colourMap[s.userId] || FALLBACK_MEMBER_COLOUR, display: 'inline-block' }} />
            {s.identifier}{s.userId === user.id ? ' (you)' : ''}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-ink/20" style={{ background: CONTESTED_COLOUR, display: 'inline-block' }} />
          Contested
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-ink/20" style={{ background: NONE_COLOUR, display: 'inline-block' }} />
          Neither visited
        </div>
        <div className="flex items-center gap-2 text-ink-soft/70">
          <span>Shade = win margin</span>
          <span className="opacity-40 text-xs">▪</span>
          <span className="opacity-70 text-xs">▪</span>
          <span className="text-xs">▪</span>
          <span>light → dominant</span>
        </div>
      </div>

      {/* Per-continent bars */}
      {continentData.length > 0 && (
        <div className="bg-panel border border-hairline rounded-lg p-4 sm:p-5 mb-6">
          <h2 className="smallcaps text-ink-soft mb-4">By continent</h2>
          <div className="space-y-5">
            {continentData.map(({ continent, perMember }) => {
              const contTotal = Object.values(perMember).reduce((s, v) => s + v, 0);
              const winner = rankedSides.find((s) => perMember[s.userId] === Math.max(...Object.values(perMember)));
              return (
                <div key={continent}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-display font-bold text-ink">{continent}</span>
                    {winner && <span className="smallcaps text-ink-soft/70">{winner.identifier} leads</span>}
                  </div>
                  <div className="space-y-1">
                    {rankedSides.map((s) => {
                      const score = round1((perMember[s.userId] || 0) * progress);
                      const pct = contTotal > 0 ? ((perMember[s.userId] || 0) / contTotal) * 100 * progress : 0;
                      const colour = colourMap[s.userId] || FALLBACK_MEMBER_COLOUR;
                      return (
                        <div key={s.userId} className="flex items-center gap-2">
                          <span className="text-xs text-ink-soft w-20 truncate">{s.identifier}</span>
                          <div className="flex-1 h-2 bg-parchment rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, background: colour }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-ink w-14 text-right">{fmt(score)} pts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contested countries */}
      {contested.length > 0 && (
        <div className="mt-2">
          <h2 className="font-display font-bold text-lg text-ink mb-3">
            Contested battlegrounds ({contested.length})
          </h2>
          <p className="text-sm text-ink-soft mb-3">
            Multiple members are dead even here — nobody owns them.
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

function round1(n) {
  return Math.round(n * 10) / 10;
}
