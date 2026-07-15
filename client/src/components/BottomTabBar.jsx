import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS, getActiveGroup } from '../lib/navGroups';

// The app's primary navigation (issue #65) — three grouped tabs fixed to the
// bottom of the screen, replacing the old flat seven-link nav and its
// hamburger. Tapping a tab always lands on that group's default sub-tab;
// <SubTabStrip /> handles moving between siblings once you're there.
export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = getActiveGroup(location.pathname);

  return (
    <nav
      aria-label="Main sections"
      className="fixed bottom-0 inset-x-0 z-30 bg-panel border-t-2 border-ink"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-3">
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup?.id === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => navigate(group.subTabs[0].path)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 smallcaps text-[11px] transition-colors ${
                isActive ? 'text-compass' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              {group.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
