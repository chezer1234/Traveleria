// Icons for the bottom tab bar and sub-tab strip (issue #65). Kept in their
// own file — plain SVGs, nothing to hot-reload — so navGroups.js can stay a
// pure data/config module.

export function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

export function IconTrophy(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v4a5 5 0 01-10 0V4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5H4.5A2.5 2.5 0 007 7.5M17 5h2.5A2.5 2.5 0 0117 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  );
}

export function IconMap(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function IconPodium(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3.5" y="12" width="4.5" height="8" rx="1" />
      <rect x="9.75" y="6.5" width="4.5" height="13.5" rx="1" />
      <rect x="16" y="9.5" width="4.5" height="10.5" rx="1" />
    </svg>
  );
}

export function IconGroups(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 15.25c2.6.2 4.5 2.1 4.5 4.75" />
    </svg>
  );
}

export function IconPlusPin(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.7 7-12a7 7 0 10-14 0c0 5.3 7 12 7 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6M9 9h6" />
    </svg>
  );
}

export function IconGlobe(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" />
    </svg>
  );
}
