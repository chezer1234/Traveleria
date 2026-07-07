// The Trophy Cabinet (chosen direction, docs/designs/direction-final.html).
// Ten achievements, evaluated client-side from the synced local DB:
// gilded medallions when earned, blind-embossed outlines with a thin ink
// progress bar when locked. Pure display — all logic lives in lib/trophies.js.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTrophyStatusLocal } from '../lib/queries';
import { evaluateTrophies } from '../lib/trophies';

const MEDAL_COLORS = {
  gold: { disc: '#c9a227', ring: '#a8871f' },
  silver: { disc: '#9aa0a6', ring: '#7d8287' },
  bronze: { disc: '#a97142', ring: '#8a5a33' },
};
// Locked: blind-embossed paper — hairline ring, muted engraving.
const LOCKED_COLORS = { disc: '#efe9db', ring: '#d8cfba' };

// Circle medal on crossed ribbons, engraved rings, icon stamped in the disc.
function Medal({ medal, earned, icon, name }) {
  const { disc, ring } = earned ? MEDAL_COLORS[medal] || MEDAL_COLORS.gold : LOCKED_COLORS;
  const ribbon = earned ? '#26221b' : '#ece5d5';
  const engrave = earned ? '#26221b' : '#c9bfa8';
  return (
    <svg
      viewBox="0 0 100 128"
      className="w-20 h-auto"
      role="img"
      aria-label={`${name} — ${earned ? 'earned' : 'locked'}`}
    >
      <path d="M33,0 L46,54 L60,50 L47,0 Z" fill={ribbon} stroke={engrave} strokeWidth="1" />
      <path d="M67,0 L54,54 L40,50 L53,0 Z" fill={ribbon} stroke={engrave} strokeWidth="1" />
      <circle cx="50" cy="86" r="38" fill={disc} stroke={ring} strokeWidth="2.5" />
      <circle cx="50" cy="86" r="32" fill="none" stroke={engrave} strokeWidth="0.8" />
      <circle cx="50" cy="86" r="26" fill="none" stroke={engrave} strokeWidth="0.6" strokeDasharray="2 3" />
      <text
        x="50"
        y="86"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="24"
        fontWeight="700"
        fill={engrave}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {icon}
      </text>
    </svg>
  );
}

// "Mon YYYY" from the qualifying visit's visited_at; null when undated.
function earnedDateLabel(earnedAt) {
  if (!earnedAt) return null;
  const d = new Date(earnedAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function TrophyCard({ trophy }) {
  const { name, requirement, medal, icon, earned, detail, progress } = trophy;
  const date = earned ? earnedDateLabel(trophy.earnedAt) : null;
  const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;
  const shownCurrent = progress ? Math.round(progress.current) : 0;
  const toGo = progress ? Math.max(0, progress.target - shownCurrent) : 0;

  return (
    <div className="bg-panel flex flex-col items-center text-center px-3 py-5 sm:px-4">
      <Medal medal={medal} earned={earned} icon={icon} name={name} />
      <h2 className={`font-display font-bold mt-2 leading-snug ${earned ? 'text-ink' : 'text-ink-soft'}`}>
        {name}
      </h2>
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
          <div className="h-1.5 rounded-full bg-parchment overflow-hidden">
            <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
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
  const [trophies, setTrophies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const stats = await getTrophyStatusLocal(db, user.id, user.home_country);
      setTrophies(evaluateTrophies(stats));
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

  if (!trophies) return null;

  const earnedCount = trophies.filter((t) => t.earned).length;

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
            {earnedCount} of {trophies.length} on display
          </span>
        </div>

        {/* Cabinet grid — hairline rules between cells; 2-up on phones */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-hairline">
          {trophies.map((t) => (
            <TrophyCard key={t.id} trophy={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
