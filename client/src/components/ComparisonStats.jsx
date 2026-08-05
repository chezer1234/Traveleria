// Stats page's comparison section (issue #75, phase 3): your own stats,
// solo — plus an optional side-by-side comparison against another
// traveller as blue-vs-red bars, the same "tug of war" bar
// Territory/GroupBattle/StateBattle already use for battles (bg-compass /
// bg-sienna — the same tokens --color-you / --color-them alias in every
// theme, see client/src/index.css).
import { useState, useEffect, useCallback } from 'react';
import { publicName } from '../lib/names';
import { getAllUsersPublicLocal, getUserComparisonStatsLocal } from '../lib/queries';
import { barSplit, COMPARISON_STATS } from '../lib/statsCompare';

const fmt = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
const rankLabel = (rank) => (rank ? `#${rank}` : 'Unranked');

export default function ComparisonStats({ db, userId, homeCountry }) {
  const [yourStats, setYourStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponentId, setOpponentId] = useState('');
  const [opponent, setOpponent] = useState(null);
  const [opponentStats, setOpponentStats] = useState(null);
  const [loadingOpponent, setLoadingOpponent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      try {
        const [stats, otherUsers] = await Promise.all([
          getUserComparisonStatsLocal(db, userId, homeCountry),
          getAllUsersPublicLocal(db, userId),
        ]);
        if (cancelled) return;
        setYourStats(stats);
        setUsers(otherUsers);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [db, userId, homeCountry]);

  const loadOpponent = useCallback(async (id) => {
    if (!id) { setOpponent(null); setOpponentStats(null); return; }
    setLoadingOpponent(true);
    setError('');
    try {
      const opp = users.find((u) => u.id === id);
      const stats = await getUserComparisonStatsLocal(db, id, opp?.home_country);
      setOpponent(opp);
      setOpponentStats(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOpponent(false);
    }
  }, [db, users]);

  function handleSelect(e) {
    const id = e.target.value;
    setOpponentId(id);
    loadOpponent(id);
  }

  if (!yourStats) return null; // still loading — the page's own spinner covers this window

  const comparing = !!opponentStats;

  return (
    <div className="plate rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <p className="font-display font-bold text-ink">Your stats</p>
          <p className="smallcaps text-ink-soft mt-0.5">
            {comparing ? `You vs ${publicName(opponent)}` : 'Compare yourself against another traveller'}
          </p>
        </div>
        {users.length > 0 && (
          <select
            value={opponentId}
            onChange={handleSelect}
            aria-label="Compare against"
            className="px-3 py-2 border border-hairline bg-panel rounded-md text-sm focus:outline-none focus:border-compass"
          >
            <option value="">Just me</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{publicName(u)}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p role="alert" className="text-red-600 text-sm mb-3">{error}</p>}
      {loadingOpponent && <p className="text-ink-soft text-sm mb-3">Loading…</p>}

      {!comparing ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden">
          {COMPARISON_STATS.map(({ key, label, rankStat }) => (
            <div key={key} className="bg-panel p-3">
              <p className="smallcaps text-ink-soft text-xs">{label}</p>
              <p className="font-display font-black text-xl tabular-nums text-ink mt-1">
                {rankStat ? rankLabel(yourStats[key]) : fmt(yourStats[key])}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {COMPARISON_STATS.map(({ key, label, rankStat }) => {
            // Leaderboard position is the one stat where *smaller* wins — a
            // proportional bar (like every other stat below) would visually
            // reward the higher, i.e. worse, number. Shown as plain ranks
            // with a trophy on whoever's ahead instead.
            if (rankStat) {
              const yourRank = yourStats[key];
              const oppRank = opponentStats[key];
              const youAhead = yourRank !== null && (oppRank === null || yourRank < oppRank);
              const oppAhead = oppRank !== null && (yourRank === null || oppRank < yourRank);
              return (
                <div key={key}>
                  <p className="smallcaps text-ink-soft mb-1.5 text-center">{label}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-bold tabular-nums text-ink flex items-center gap-1.5">
                      {youAhead && <span title="Ahead">🏆</span>} {rankLabel(yourRank)}
                    </span>
                    <span className="text-ink-soft text-xs">of {yourStats.totalUsers}</span>
                    <span className="font-display font-bold tabular-nums text-ink flex items-center gap-1.5">
                      {rankLabel(oppRank)} {oppAhead && <span title="Ahead">🏆</span>}
                    </span>
                  </div>
                </div>
              );
            }
            const { pctA, pctB } = barSplit(yourStats[key], opponentStats[key]);
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-display font-bold tabular-nums text-ink">{fmt(yourStats[key])}</span>
                  <span className="smallcaps text-ink-soft">{label}</span>
                  <span className="font-display font-bold tabular-nums text-ink">{fmt(opponentStats[key])}</span>
                </div>
                <div className="relative h-2.5 select-none" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-compass" style={{ width: `calc(${pctA}% - 1px)` }} />
                  <div className="absolute inset-y-0 right-0 rounded-full bg-sienna" style={{ width: `calc(${pctB}% - 1px)` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
