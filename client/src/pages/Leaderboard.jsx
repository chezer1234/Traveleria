import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLeaderboardLocal } from '../lib/queries';
import { countryFlag as flag } from '../lib/flag';

export default function Leaderboard() {
  const { user, db, dbStatus } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const data = await getLeaderboardLocal(db, user?.id);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user?.id]);

  useEffect(() => {
    if (dbStatus === 'ready') loadLeaderboard();
  }, [dbStatus, loadLeaderboard]);

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-ink-soft text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadLeaderboard} className="ml-4 text-red-700 underline hover:no-underline text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Separate top 50 from the appended current user (if outside top 50)
  const top50 = entries.filter(e => !e.current_user);
  const outsideUser = entries.find(e => e.current_user);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-black text-2xl sm:text-3xl text-ink mb-6">Leaderboard</h1>

      <div className="bg-panel border border-hairline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-paper">
                <th className="px-4 py-3 text-left smallcaps text-ink-soft w-16">Rank</th>
                <th className="px-4 py-3 text-left smallcaps text-ink-soft">User</th>
                <th className="px-4 py-3 text-left smallcaps text-ink-soft">Home</th>
                <th className="px-4 py-3 text-right smallcaps text-ink-soft">Points</th>
                <th className="px-4 py-3 text-right smallcaps text-ink-soft">Countries</th>
                <th className="px-4 py-3 text-right smallcaps text-ink-soft">Battle / Group</th>
              </tr>
            </thead>
            <tbody>
              {top50.map((entry) => {
                const isCurrentUser = user && entry.user_id === user.id;
                return (
                  <tr
                    key={entry.user_id}
                    className={`${isCurrentUser ? 'bg-gold/10 border-b border-gold/40' : 'border-b border-hairline/60 hover:bg-paper'}`}
                  >
                    <td className="px-4 py-3 text-ink-soft font-display font-bold tabular-nums">{entry.rank}</td>
                    <td className="px-4 py-3 text-ink font-medium">
                      {isCurrentUser ? (
                        entry.identifier
                      ) : (
                        <Link
                          to={`/territory/${entry.user_id}`}
                          className="hover:text-compass hover:underline"
                          title={`Territory battle vs ${entry.identifier}`}
                        >
                          {entry.identifier}
                        </Link>
                      )}
                      {isCurrentUser && <span className="ml-2 text-xs text-compass">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span title={entry.home_country}>{flag(entry.home_country)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-ink tabular-nums">
                      {(Math.round(entry.total_points * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft tabular-nums">{entry.countries_visited}</td>
                    <td className="px-4 py-3 text-right">
                      {!isCurrentUser && (
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/territory/${entry.user_id}`}
                            className="inline-flex items-center gap-1 bg-ink text-paper smallcaps px-2.5 py-2 rounded hover:bg-ink/80"
                            title={`Territory battle vs ${entry.identifier}`}
                          >
                            ⚔<span className="hidden sm:inline">Battle</span>
                          </Link>
                          <Link
                            to={`/groups?add=${entry.user_id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-2 text-atlas hover:text-atlas-deep font-medium"
                            title={`Add ${entry.identifier} to a group`}
                          >
                            +<span className="hidden sm:inline">Group</span>
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {outsideUser && (
                <>
                  <tr className="border-b border-hairline/60">
                    <td colSpan={6} className="px-4 py-2 text-center text-ink-soft/70 text-xs">
                      ...
                    </td>
                  </tr>
                  <tr className="bg-gold/10 border-b border-gold/40">
                    <td className="px-4 py-3 text-ink-soft font-display font-bold tabular-nums">{outsideUser.rank}</td>
                    <td className="px-4 py-3 text-ink font-medium">
                      {outsideUser.identifier}
                      <span className="ml-2 text-xs text-compass">(you)</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span title={outsideUser.home_country}>{flag(outsideUser.home_country)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-ink tabular-nums">
                      {(Math.round(outsideUser.total_points * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft tabular-nums">{outsideUser.countries_visited}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </>
              )}

              {top50.length === 0 && !outsideUser && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-soft">
                    No users on the leaderboard yet. Start exploring!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
