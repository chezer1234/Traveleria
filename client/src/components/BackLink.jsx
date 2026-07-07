import { Link, useLocation } from 'react-router-dom';

// Labels for the places a drill-in page can be reached from. Anything not
// listed (e.g. another country page) gets the generic "Back".
const LABELS = [
  ['/dashboard', 'Back to Dashboard'],
  ['/add-countries', 'Back to Add Countries'],
  ['/leaderboard', 'Back to Leaderboard'],
  ['/map', 'Back to Map'],
  ['/subregions', 'Back to Subregions'],
  ['/trophies', 'Back to Trophies'],
  ['/groups', 'Back to Groups'],
  ['/territory', 'Back to Battle'],
  ['/countries', 'Back to country'],
];

function labelFor(path) {
  const match = LABELS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
  return match ? match[1] : 'Back';
}

// Context-aware back link: goes to the page the user actually came from
// (passed via Link state by CountryLink and friends), falling back to a
// sensible per-page default for direct visits and bookmarks.
export default function BackLink({ fallback = '/dashboard' }) {
  const location = useLocation();
  const to = location.state?.from || fallback;

  return (
    <Link to={to} className="smallcaps text-compass hover:text-compass-deep mb-4 inline-block">
      &larr; {labelFor(to)}
    </Link>
  );
}
