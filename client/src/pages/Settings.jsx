import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updateUserProfile, ApiError } from '../api/client';
import { isStyleUnlocked } from '../lib/styleUnlocks';
import { publicName } from '../lib/names';

function Swatch({ colors }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {colors.map((c) => (
        <span
          key={c}
          className="w-3 h-3 rounded-full border border-ink/20"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

// One style card: swatch + name + tagline, and either the select control or
// the lock (threshold, points to go, progress bar).
function StyleCard({ themeDef, active, points, onSelect }) {
  const required = themeDef.unlock?.points || 0;
  const unlocked = !themeDef.unlock || isStyleUnlocked(themeDef.id, points);
  const have = Math.max(0, Math.round(Number(points) || 0));
  const toGo = Math.max(0, Math.ceil(required - (Number(points) || 0)));
  const pct = required > 0 ? Math.min(100, ((Number(points) || 0) / required) * 100) : 100;

  return (
    <div
      className={`plate rounded-lg p-4 flex flex-col gap-2 ${
        active ? 'outline outline-2 outline-compass' : ''
      } ${unlocked ? '' : 'opacity-70'}`}
      data-style-card={themeDef.id}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display font-bold text-ink">{themeDef.name}</span>
        <Swatch colors={themeDef.swatch} />
      </div>
      <p className="text-xs text-ink-soft">{themeDef.tagline}</p>

      {unlocked ? (
        <button
          type="button"
          onClick={onSelect}
          disabled={active}
          aria-pressed={active}
          className={`mt-auto smallcaps rounded-md px-3 py-2 border transition-colors ${
            active
              ? 'bg-compass text-paper border-compass cursor-default'
              : 'border-hairline text-ink hover:border-compass hover:text-compass'
          }`}
        >
          {active ? 'In use' : 'Use this style'}
        </button>
      ) : (
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-2 smallcaps text-ink-soft">
            <span aria-hidden="true">🔒 Locked</span>
            <span className="tabular-nums">{required.toLocaleString()} pts</span>
          </div>
          <div className="h-1.5 rounded-full bg-parchment overflow-hidden mt-1.5">
            <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
          <p className="smallcaps text-ink-soft/80 tabular-nums mt-1.5">
            {have.toLocaleString()} of {required.toLocaleString()} · {toGo.toLocaleString()} to go
          </p>
        </div>
      )}
    </div>
  );
}

// The Settings tab (issue #69): display name + the ONLY place to change the
// app style. Locked styles show their Travel Points price and progress.
export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme, themes, stylePoints, refreshStylePoints } = useTheme();

  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // A trip logged since the app loaded should count immediately.
  useEffect(() => {
    refreshStylePoints();
  }, [refreshStylePoints]);

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await updateUserProfile(user.id, displayName.trim());
      setUser({ ...user, display_name: res.display_name });
      setDisplayName(res.display_name || '');
      setSaved(true);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.errors?.length
          ? err.errors.map((x) => x.message).join(' · ')
          : err.message || 'Could not save your display name.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">Settings</h1>
        <p className="smallcaps text-ink-soft mt-1">Your name on the board · your look</p>
      </header>

      {/* Display name */}
      <section className="plate rounded-lg p-5 mb-6" aria-labelledby="settings-name">
        <h2 id="settings-name" className="font-display font-bold text-lg text-ink">
          Display name
        </h2>
        <p className="text-sm text-ink-soft mt-1">
          Shown on the leaderboard, battles and groups. Leave it empty to use your
          handle (<span className="font-medium text-ink">{user.identifier}</span>).
        </p>
        <form onSubmit={handleSaveName} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={displayName}
            maxLength={40}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            placeholder={user.identifier}
            aria-label="Display name"
            className="flex-1 px-4 py-2.5 border border-hairline bg-panel rounded-md focus:border-compass outline-none transition"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-compass text-paper font-semibold rounded-md hover:bg-compass-deep disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {saved && (
          <p role="status" className="text-sm text-compass mt-2">
            Saved — the leaderboard now shows “{publicName(user)}”.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </section>

      {/* Style */}
      <section aria-labelledby="settings-style">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 id="settings-style" className="font-display font-bold text-lg text-ink">
            App style
          </h2>
          <span className="smallcaps text-ink-soft tabular-nums">
            {stylePoints == null ? 'Counting your points…' : `You have ${Math.round(stylePoints).toLocaleString()} pts`}
          </span>
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Styles are earned with Travel Points and unlock in order — keep exploring
          to open the next one. Each unlock also lands a trophy in the cabinet.
        </p>
        <div className="grid sm:grid-cols-2 gap-4" role="radiogroup" aria-label="App style">
          {themes.map((t) => (
            <StyleCard
              key={t.id}
              themeDef={t}
              active={theme === t.id}
              points={stylePoints}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
