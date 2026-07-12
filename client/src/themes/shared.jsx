// Slot components shared between theme definitions (issue #63).
// A theme definition picks these (or supplies its own) — app components render
// slots from the active definition and never branch on a theme id.

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
