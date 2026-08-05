// Stats page (issue #75): phase 1 is the points-over-time graph, phase 2
// adds the continent map (pie overlay + choropleth toggle). Lives as a
// sub-tab under Overview alongside Dashboard/Trophies/Map/Settings (see
// client/src/lib/navGroups.js). See docs/features/stats-points-history.md
// and docs/features/stats-continent-map.md for the design + Q&A behind this
// scope — the user-comparison bars from the original issue are a separate
// follow-up issue (phase 3).
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserPointsHistoryLocal, getUserContinentStatsLocal } from '../lib/queries';
import { bucketHistoryByDay } from '../lib/pointsHistory';
import PointsHistoryChart from '../components/PointsHistoryChart';
import ContinentPointsMap from '../components/ContinentPointsMap';

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Stats() {
  const { user, db, dbStatus } = useAuth();
  const [history, setHistory] = useState(null);
  const [continentStats, setContinentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [raw, continentData] = await Promise.all([
        getUserPointsHistoryLocal(db, user.id, user.home_country),
        getUserContinentStatsLocal(db, user.id, user.home_country),
      ]);
      setHistory(bucketHistoryByDay(raw));
      setContinentStats(continentData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id, user.home_country]);

  useEffect(() => {
    if (dbStatus === 'ready') loadData();
  }, [dbStatus, loadData]);

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-ink-soft text-sm">Loading your points history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="ml-4 text-red-700 underline hover:no-underline text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasHistory = history && history.length > 0;
  const total = hasHistory ? history[history.length - 1].totalPoints : 0;
  const firstDate = hasHistory ? history[0].date : null;
  const spanDays = hasHistory
    ? Math.max(1, Math.round((new Date(history[history.length - 1].date) - new Date(firstDate)) / 86400000) + 1)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-ink">Stats</h1>
        <p className="text-ink-soft mt-1">Your points, over time.</p>
      </div>

      {!hasHistory ? (
        <div className="bg-panel border border-hairline rounded-lg p-12 text-center">
          <p className="text-ink-soft mb-4">Log a country to start your points history.</p>
          <Link to="/add-countries" className="text-compass font-medium hover:underline">
            Start adding countries
          </Link>
        </div>
      ) : (
        <>
          <div className="plate rounded-lg p-6 sm:p-8 mb-6">
            <div className="border-l-2 border-gold pl-4 mb-6">
              <p className="smallcaps text-ink-soft mb-1">Total Travel Points</p>
              <p className="text-4xl sm:text-5xl font-display font-black tabular-nums text-ink">{fmt(total)}</p>
              <p className="text-ink-soft mt-2">
                Logged over {spanDays} {spanDays === 1 ? 'day' : 'days'}, since {fmtDate(firstDate)}
              </p>
            </div>
            <PointsHistoryChart history={history} />
          </div>

          <p className="text-xs text-ink-soft/70 px-1 mb-6">
            Plots your running total at the moment each country, province, city, or experience was logged in the app
            — not the date you actually travelled, which isn't always known.
          </p>

          {continentStats && <ContinentPointsMap continentStats={continentStats} />}
        </>
      )}
    </div>
  );
}
