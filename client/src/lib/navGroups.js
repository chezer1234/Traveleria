import {
  IconGlobe,
  IconGroups,
  IconHome,
  IconMap,
  IconPlusPin,
  IconPodium,
  IconTrophy,
} from '../components/icons/NavIcons';

// Bottom tab bar structure (issue #65) — three main groups, each landing on
// a default sub-tab, each sub-tab reachable from its siblings via
// <SubTabStrip />. A group's icon matches its default sub-tab's icon so the
// same shape carries you from the bottom bar into the page you land on.
export const NAV_GROUPS = [
  {
    id: 'comparison',
    label: 'Comparison',
    icon: IconPodium,
    subTabs: [
      { path: '/leaderboard', label: 'Leaderboard', icon: IconPodium },
      { path: '/groups', label: 'Groups', icon: IconGroups },
    ],
  },
  {
    id: 'points',
    label: 'Points',
    icon: IconPlusPin,
    subTabs: [
      { path: '/add-countries', label: 'Add Countries', icon: IconPlusPin },
      { path: '/subregions', label: 'Subregions', icon: IconGlobe },
    ],
  },
  {
    id: 'overview',
    label: 'Overview',
    icon: IconHome,
    subTabs: [
      { path: '/dashboard', label: 'Dashboard', icon: IconHome },
      { path: '/trophies', label: 'Trophies', icon: IconTrophy },
      { path: '/map', label: 'Map', icon: IconMap },
    ],
  },
];

// Drill-in routes (country detail, territory, group/state battles) aren't
// sub-tabs themselves but still belong to a group for the purpose of
// highlighting the bottom bar — same continuity Charlie asked for ("as it
// works now") without needing full breadcrumb tracking.
const GROUP_PREFIXES = {
  comparison: ['/leaderboard', '/groups', '/territory'],
  points: ['/add-countries', '/subregions', '/state-battle'],
  overview: ['/dashboard', '/trophies', '/map', '/countries'],
};

export function getActiveGroup(pathname) {
  return NAV_GROUPS.find((group) =>
    GROUP_PREFIXES[group.id].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}
