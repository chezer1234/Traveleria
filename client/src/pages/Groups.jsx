import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserGroupsLocal, getLeaderboardLocal } from '../lib/queries';
import {
  createGroupOptimistic,
  deleteGroupOptimistic,
  leaveGroupOptimistic,
} from '../lib/mutations';
import { resolveColours } from '../lib/territory';

const flag = (code) =>
  code ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

const COLOUR_PRESETS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

function ColourPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ink-soft w-20">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {COLOUR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              value === c ? 'border-ink scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <span className="text-xs text-ink-soft/70 tabular-nums">{value}</span>
    </div>
  );
}

function MemberChips({ members, colourMap }) {
  return (
    <div className="flex -space-x-1">
      {members.slice(0, 6).map((m) => (
        <div
          key={m.id}
          className="w-7 h-7 rounded-full border-2 border-panel flex items-center justify-center text-xs font-bold text-white"
          style={{ background: colourMap[m.user_id] || '#6b7280' }}
          title={m.user?.identifier || m.user_id}
        >
          {(m.user?.identifier || '?')[0].toUpperCase()}
        </div>
      ))}
      {members.length > 6 && (
        <div className="w-7 h-7 rounded-full border-2 border-panel bg-parchment flex items-center justify-center text-xs font-bold text-ink-soft">
          +{members.length - 6}
        </div>
      )}
    </div>
  );
}

export default function Groups() {
  const { user, db, dbStatus } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Creation form state.
  const [groupName, setGroupName] = useState('');
  const [primaryColour, setPrimaryColour] = useState('#3b82f6');
  const [secondaryColour, setSecondaryColour] = useState('#22c55e');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [memberColours, setMemberColours] = useState({}); // { userId: { primary, secondary } }
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [g, lb] = await Promise.all([
        getUserGroupsLocal(db, user.id),
        getLeaderboardLocal(db, user.id),
      ]);
      setGroups(g);
      setLeaderboard(lb.filter((e) => e.user_id !== user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  function toggleMember(userId) {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      const next = [...prev, userId];
      // Assign default colours for new member.
      setMemberColours((mc) => ({
        ...mc,
        [userId]: mc[userId] || { primary: '#ef4444', secondary: '#f59e0b' },
      }));
      return next;
    });
  }

  function setMemberPrimary(userId, colour) {
    setMemberColours((mc) => ({ ...mc, [userId]: { ...mc[userId], primary: colour } }));
  }
  function setMemberSecondary(userId, colour) {
    setMemberColours((mc) => ({ ...mc, [userId]: { ...mc[userId], secondary: colour } }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!groupName.trim()) { setCreateError('Give the group a name.'); return; }
    if (!selectedUserIds.length) { setCreateError('Pick at least one other member.'); return; }

    setCreating(true);
    setCreateError('');
    try {
      const members = selectedUserIds.map((uid) => ({
        user_id: uid,
        primary_colour: memberColours[uid]?.primary || '#ef4444',
        secondary_colour: memberColours[uid]?.secondary || '#f59e0b',
      }));
      const groupId = await createGroupOptimistic(
        db, user.id, groupName.trim(), primaryColour, secondaryColour, members,
      );
      setShowCreate(false);
      setGroupName('');
      setSelectedUserIds([]);
      setMemberColours({});
      await load();
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleLeave(group) {
    if (!confirm(`Leave "${group.name}"?`)) return;
    try {
      await leaveGroupOptimistic(db, group.id, user.id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(group) {
    if (!confirm(`Delete "${group.name}" for everyone?`)) return;
    try {
      await deleteGroupOptimistic(db, group.id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="text-ink-soft text-sm">Loading groups…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">Groups</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 bg-compass text-paper text-sm font-medium rounded-md hover:bg-compass-deep transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New group'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 text-sm mb-6">{error}</div>
      )}

      {/* Creation form */}
      {showCreate && (
        <div className="plate rounded-lg p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-ink mb-4">Create a group</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Group name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Family Travellers"
                maxLength={60}
                className="w-full border border-hairline bg-panel rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-compass"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Your colours</p>
              <ColourPicker label="Primary" value={primaryColour} onChange={setPrimaryColour} />
              <ColourPicker label="Secondary" value={secondaryColour} onChange={setSecondaryColour} />
            </div>

            <div>
              <p className="text-sm font-medium text-ink mb-2">Add members from the leaderboard</p>
              {leaderboard.length === 0 && (
                <p className="text-sm text-ink-soft/70">No other users yet.</p>
              )}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {leaderboard.map((entry) => {
                  const selected = selectedUserIds.includes(entry.user_id);
                  return (
                    <div key={entry.user_id} className={`rounded-lg border p-3 ${selected ? 'border-atlas/40 bg-atlas/10' : 'border-hairline'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMember(entry.user_id)}
                            className="rounded border-hairline accent-compass"
                          />
                          <span className="font-medium text-ink text-sm">{entry.identifier}</span>
                          <span>{flag(entry.home_country)}</span>
                          <span className="text-xs text-ink-soft/70">#{entry.rank}</span>
                        </label>
                      </div>
                      {selected && (
                        <div className="mt-2 space-y-1.5 pl-6">
                          <ColourPicker
                            label="Primary"
                            value={memberColours[entry.user_id]?.primary || '#ef4444'}
                            onChange={(c) => setMemberPrimary(entry.user_id, c)}
                          />
                          <ColourPicker
                            label="Secondary"
                            value={memberColours[entry.user_id]?.secondary || '#f59e0b'}
                            onChange={(c) => setMemberSecondary(entry.user_id, c)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-compass text-paper font-medium rounded-md hover:bg-compass-deep disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create group'}
            </button>
          </form>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 && !showCreate ? (
        <div className="text-center py-16 text-ink-soft">
          <p className="text-lg mb-2">No groups yet.</p>
          <p className="text-sm">Create one to start a multi-player territory battle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const colourMap = resolveColours(
              group.members.map((m) => ({ userId: m.user_id, primary_colour: m.primary_colour, secondary_colour: m.secondary_colour })),
            );
            const isCreator = group.created_by === user.id;
            return (
              <div key={group.id} className="bg-panel border border-hairline rounded-lg p-4 flex flex-wrap items-center gap-4">
                <MemberChips members={group.members} colourMap={colourMap} />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/groups/${group.id}`}
                    className="font-semibold text-ink hover:text-compass truncate block"
                  >
                    {group.name}
                  </Link>
                  <p className="text-xs text-ink-soft/70 mt-0.5">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''} ·{' '}
                    {group.members.map((m) => m.user?.identifier || '?').join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/groups/${group.id}`}
                    className="px-3 py-2 text-sm text-compass border border-compass/30 rounded-md hover:bg-compass/10 font-medium"
                  >
                    Open
                  </Link>
                  {isCreator ? (
                    <button
                      onClick={() => handleDelete(group)}
                      className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50 font-medium"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeave(group)}
                      className="px-3 py-2 text-sm text-ink-soft border border-hairline rounded-md hover:bg-paper font-medium"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
