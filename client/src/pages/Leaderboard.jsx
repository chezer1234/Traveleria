import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../api/client';

const flag = (code) =>
  code ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setError('');
    try {
      const data = await getLeaderboard(user?.id);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-gray-500 text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-16">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Username</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Home</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Countries</th>
              </tr>
            </thead>
            <tbody>
              {top50.map((entry) => {
                const isCurrentUser = user && entry.user_id === user.id;
                return (
                  <tr
                    key={entry.user_id}
                    className={`border-b border-gray-100 ${isCurrentUser ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 text-gray-600 font-medium">{entry.rank}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {entry.username}
                      {isCurrentUser && <span className="ml-2 text-xs text-indigo-600">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span title={entry.home_country}>{flag(entry.home_country)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">
                      {(Math.round(entry.total_points * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{entry.countries_visited}</td>
                  </tr>
                );
              })}

              {outsideUser && (
                <>
                  <tr className="border-b border-gray-100">
                    <td colSpan={5} className="px-4 py-2 text-center text-gray-400 text-xs">
                      ...
                    </td>
                  </tr>
                  <tr className="bg-indigo-50">
                    <td className="px-4 py-3 text-gray-600 font-medium">{outsideUser.rank}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {outsideUser.username}
                      <span className="ml-2 text-xs text-indigo-600">(you)</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span title={outsideUser.home_country}>{flag(outsideUser.home_country)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">
                      {(Math.round(outsideUser.total_points * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{outsideUser.countries_visited}</td>
                  </tr>
                </>
              )}

              {top50.length === 0 && !outsideUser && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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
