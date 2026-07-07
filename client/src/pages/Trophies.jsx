// The Trophy Cabinet 1.6 (issue #52, docs/features/trophies-1-6.md).
// Forty-six achievements evaluated client-side from the synced local DB, in
// three sections: seven five-tier ladders, six continental conquests, five
// special honours. Original artwork per category lives in lib/trophyArt.js;
// all logic lives in lib/trophies.js. This page is pure display.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTrophyStatusLocal } from '../lib/queries';
import { evaluateCabinet, sortTrophies, SORT_OPTIONS, TIERS } from '../lib/trophies';
import TrophyMedal from '../components/TrophyMedal';

const VIEW_MODES = [
  { key: 'all', label: 'Full Collection' },
  { key: 'cabinet', label: 'My Cabinet' },
];

function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 bg-paper border border-hairline rounded-md p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`px-3 py-2 rounded-md smallcaps transition-colors ${
            value === key ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// "Mon YYYY" from the qualifying visit's visited_at; null when undated.
function earnedDateLabel(earnedAt) {
  if (!earnedAt) return null;
  const d = new Date(earnedAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function ProgressBar({ current, target }) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div className="h-1.5 rounded-full bg-parchment overflow-hidden">
      <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionRule({ title, note }) {
  return (
    <div className="text-center px-4 pt-6 pb-4">
      <h2 className="font-display font-black text-lg tracking-[0.1em] text-ink">{title}</h2>
      <p className="smallcaps text-ink-soft mt-1">{note}</p>
    </div>
  );
}

// One five-rung ladder: the tier medals side by side, then the chase — the
// first unearned rung's progress bar and detail.
function LadderRow({ ladder }) {
  const byTier = Object.fromEntries(ladder.trophies.map((t) => [t.medal, t]));
  const rungs = TIERS.map((tier) => byTier[tier]).filter(Boolean);
  const earnedCount = rungs.filter((t) => t.earned).length;
  const next = rungs.find((t) => !t.earned);
  const crown = rungs[rungs.length - 1];

  return (
    <div className="bg-panel px-3 py-5 sm:px-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display font-bold text-ink">{ladder.title}</h3>
        <span className="smallcaps text-ink-soft tabular-nums">{earnedCount} of {rungs.length}</span>
      </div>

      <div className="grid grid-cols-5 gap-1 mt-3">
        {rungs.map((t) => (
          <div key={t.id} className="flex flex-col items-center text-center">
            <TrophyMedal
              shape={t.shape}
              tier={t.medal}
              earned={t.earned}
              glyph={t.glyph}
              name={t.name}
              className="w-full max-w-[72px] h-auto"
            />
            <p
              className={`w-full font-sans uppercase font-semibold text-[8px] sm:text-[10px] tracking-[0.06em] sm:tracking-[0.08em] leading-tight break-words mt-1 ${t.earned ? 'text-ink' : 'text-ink-soft'}`}
            >
              {t.name}
            </p>
            {t.earned && (
              <p className="text-gold text-[10px] mt-0.5" aria-hidden="true">✦</p>
            )}
          </div>
        ))}
      </div>

      {next ? (
        <div className="mt-4">
          <ProgressBar current={next.progress ? next.progress.current : 0} target={next.progress ? next.progress.target : 1} />
          {next.progress && (
            <div className="flex justify-between gap-2 smallcaps text-ink-soft tabular-nums mt-1.5">
              <span>
                {Math.round(next.progress.current).toLocaleString()} of {next.progress.target.toLocaleString()} · {next.requirement}
              </span>
              <span>{Math.max(0, next.progress.target - Math.round(next.progress.current)).toLocaleString()} to go</span>
            </div>
          )}
          <p className="font-display italic text-xs text-ink-soft mt-1">{next.detail}</p>
        </div>
      ) : (
        <p className="smallcaps text-ink mt-4">
          <span className="text-gold" aria-hidden="true">✦ </span>
          Ladder complete — <span className="font-display italic normal-case tracking-normal text-sm">{crown.detail}</span>
        </p>
      )}
    </div>
  );
}

// Conquests and specials share the 1.5 card: medal, name, requirement, and
// either the earned line or the ink progress bar.
function TrophyCard({ trophy }) {
  const { name, requirement, medal, shape, glyph, earned, detail, progress } = trophy;
  const date = earned ? earnedDateLabel(trophy.earnedAt) : null;
  const shownCurrent = progress ? Math.round(progress.current) : 0;
  const toGo = progress ? Math.max(0, progress.target - shownCurrent) : 0;

  return (
    <div className="bg-panel flex flex-col items-center text-center px-3 py-5 sm:px-4">
      <TrophyMedal shape={shape} tier={medal} earned={earned} glyph={glyph} name={name} />
      <h3 className={`font-display font-bold mt-2 leading-snug ${earned ? 'text-ink' : 'text-ink-soft'}`}>
        {name}
      </h3>
      <p className="smallcaps text-ink-soft mt-1.5 leading-relaxed">{requirement}</p>

      {earned ? (
        <div className="mt-auto pt-3 w-full">
          <p className="smallcaps text-ink">
            <span className="text-gold" aria-hidden="true">✦ </span>
            Earned{date ? ` · ${date}` : ''}
          </p>
          <p className="font-display italic text-sm text-ink-soft mt-0.5">{detail}</p>
        </div>
      ) : (
        <div className="mt-auto pt-3 w-full">
          <ProgressBar current={progress ? progress.current : 0} target={progress ? progress.target : 1} />
          {progress && progress.target > 1 && (
            <div className="flex justify-between gap-2 smallcaps text-ink-soft tabular-nums mt-1.5">
              <span>
                {shownCurrent.toLocaleString()} of {progress.target.toLocaleString()}
              </span>
              <span>{toGo.toLocaleString()} to go</span>
            </div>
          )}
          <p className="font-display italic text-xs text-ink-soft mt-1.5">{detail}</p>
        </div>
      )}
    </div>
  );
}

export default function Trophies() {
  const { user, db, dbStatus } = useAuth();
  const [cabinet, setCabinet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [sortKey, setSortKey] = useState('recent');

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const stats = await getTrophyStatusLocal(db, user.id, user.home_country);
      setCabinet(evaluateCabinet(stats));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id, user.home_country]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="text-ink-soft text-sm">Opening the cabinet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!cabinet) return null;

  const earned = cabinet.all.filter((t) => t.earned);
  const earnedCount = earned.length;
  const sortedEarned = viewMode === 'cabinet' ? sortTrophies(earned, sortKey) : earned;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="plate rounded-lg overflow-hidden">
        {/* Cartouche */}
        <div className="relative text-center px-4 pt-6 pb-5 border-b border-hairline">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[0.08em] text-ink">
            THE TROPHY CABINET
          </h1>
          <p className="smallcaps text-ink-soft mt-1.5">
            Achievements of the expedition · engraved as earned
          </p>
          <p className="text-gold text-xs tracking-[0.4em] mt-1.5" aria-hidden="true">✦ ✦ ✦</p>
          <span className="stamp text-compass tabular-nums mt-3 sm:mt-0 sm:absolute sm:right-5 sm:top-5">
            {earnedCount} of {cabinet.all.length} on display
          </span>
        </div>

        {/* View + sort controls */}
        <div className="bg-panel border-b border-hairline px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <PillGroup options={VIEW_MODES} value={viewMode} onChange={setViewMode} />
          {viewMode === 'cabinet' && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <p className="smallcaps text-ink-soft shrink-0">Sort:</p>
              <PillGroup options={SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))} value={sortKey} onChange={setSortKey} />
            </div>
          )}
        </div>

        {viewMode === 'cabinet' ? (
          <>
            <SectionRule
              title="MY CABINET"
              note={earnedCount === 0 ? 'Nothing on the shelf yet' : `${earnedCount} unlocked ${earnedCount === 1 ? 'trophy' : 'trophies'}`}
            />
            {sortedEarned.length === 0 ? (
              <p className="font-display italic text-sm text-ink-soft text-center px-4 pb-8">
                Log a country to start filling the shelf.
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-hairline border-t border-hairline">
                {sortedEarned.map((t) => (
                  <TrophyCard key={t.id} trophy={t} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Ladders — bronze to platinum, seven disciplines */}
            <SectionRule
              title="EXPEDITION LADDERS"
              note="Bronze · Silver · Gold · Diamond · Platinum"
            />
            <div className="grid sm:grid-cols-2 gap-px bg-hairline border-t border-hairline">
              {cabinet.ladders.map((l) => (
                <LadderRow key={l.key} ladder={l} />
              ))}
              {cabinet.ladders.length % 2 === 1 && <div className="bg-panel hidden sm:block" />}
            </div>

            {/* Continental conquests — every country in a continent, platinum only */}
            <SectionRule
              title="CONTINENTAL CONQUESTS"
              note="Every country on the continent · platinum honours"
            />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-hairline border-t border-hairline">
              {cabinet.conquests.map((t) => (
                <TrophyCard key={t.id} trophy={t} />
              ))}
            </div>

            {/* Special honours */}
            <SectionRule
              title="SPECIAL HONOURS"
              note="One-off feats of the expedition"
            />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-hairline border-t border-hairline">
              {cabinet.specials.map((t) => (
                <TrophyCard key={t.id} trophy={t} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
