import { NavLink, useLocation } from 'react-router-dom';
import { NAV_GROUPS } from '../lib/navGroups';

// The "apparent icon" from issue #65 — once you've landed on a sub-tab (say
// Leaderboard, via the Comparison tab), this strip is the way across to its
// sibling sub-tabs (Groups) without dropping back to the bottom bar. Only
// renders on a page that is itself a sub-tab, and only when its group has
// more than one.
export default function SubTabStrip() {
  const location = useLocation();
  const group = NAV_GROUPS.find((g) => g.subTabs.some((tab) => tab.path === location.pathname));

  if (!group || group.subTabs.length < 2) return null;

  return (
    <div aria-label={`${group.label} sections`} className="bg-paper border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4 flex gap-2 py-2 overflow-x-auto">
        {group.subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full smallcaps text-xs border whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-compass text-paper border-compass'
                    : 'text-ink-soft border-hairline hover:text-ink hover:border-ink/40'
                }`
              }
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
