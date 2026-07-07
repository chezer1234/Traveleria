import { Link, useLocation } from 'react-router-dom';

// A country's name always links to its country page (issue #53). Carries the
// current location in state so the country page's BackLink can send the user
// back to where they actually came from, not a hardcoded default.
export default function CountryLink({ code, name, tab, className = '', children }) {
  const location = useLocation();
  const to = tab ? `/countries/${code}?tab=${tab}` : `/countries/${code}`;

  return (
    <Link
      to={to}
      state={{ from: location.pathname + location.search }}
      className={className || 'hover:text-compass hover:underline'}
    >
      {children || name}
    </Link>
  );
}
