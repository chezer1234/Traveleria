// Slot components shared between theme definitions (issue #63).
// A theme definition picks these (or supplies its own) — app components render
// slots from the active definition and never branch on a theme id.

// The Traveleria brand mark — Charlie's pick from the ten concepts in
// docs/designs/logos (PR #72): the boarding-pass ticket. Master art is
// docs/designs/logos/04-boarding-pass.svg; this inline copy is cropped to the
// ticket's bounds, and the notches + perforation are punched out with a mask
// so the mark sits on any theme's top-bar colour. The brand colours are fixed
// (they don't follow theme tokens) — the mark stays the same across themes,
// like an app icon does. Callers size it in em so it scales with the wordmark.
export function BrandMark({ className = '' }) {
  return (
    <svg viewBox="52 132 408 248" className={className} aria-hidden="true" focusable="false">
      <defs>
        <mask id="traveleria-brand-punch" maskUnits="userSpaceOnUse" x="52" y="132" width="408" height="248">
          <rect x="52" y="132" width="408" height="248" fill="#fff" />
          <circle cx="330" cy="158" r="17" fill="#000" />
          <circle cx="330" cy="354" r="17" fill="#000" />
          <line x1="330" y1="186" x2="330" y2="328" stroke="#000" strokeWidth="6" strokeDasharray="2 16" strokeLinecap="round" />
        </mask>
      </defs>
      <g transform="rotate(-7 256 256)">
        <rect x="66" y="158" width="380" height="196" rx="22" fill="#0f9d8f" mask="url(#traveleria-brand-punch)" />
        <g fill="#fdfbf7">
          <rect x="118" y="190" width="160" height="40" rx="8" />
          <rect x="177" y="190" width="42" height="112" rx="8" />
          <rect x="356" y="192" width="9" height="128" />
          <rect x="371" y="192" width="16" height="128" />
          <rect x="393" y="192" width="7" height="128" />
          <rect x="406" y="192" width="12" height="128" />
        </g>
        <rect x="118" y="314" width="120" height="13" rx="6.5" fill="#f59e0b" />
        <rect x="250" y="314" width="46" height="13" rx="6.5" fill="#7ed8cf" />
      </g>
    </svg>
  );
}

// The default inline visited mark — the rotated/mono/sticker `.stamp` chrome
// is already theme-scoped CSS, so one component serves any theme that wants
// its visited mark inline in the country title row.
export function StampMark({ year }) {
  return (
    <span className="stamp text-compass ml-auto">
      VISITED{year ? ` · ${year}` : ''}
    </span>
  );
}
