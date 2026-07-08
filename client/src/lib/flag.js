// Emoji flag for an ISO 3166-1 alpha-2 code, rendered from the regional-indicator
// symbols (e.g. 'GB' → 🇬🇧). Previously copy-pasted into every component that
// showed a flag; kept in one place so the lookup can't drift.
//
// Overrides (issue #59): Antarctica (AQ) has no official flag, so we fly a
// penguin instead — nobody owns the ice, and it's the continent's most iconic
// resident. See docs/features/antarctica.md.
const FLAG_OVERRIDES = {
  AQ: '🐧',
};

export function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  if (FLAG_OVERRIDES[upper]) return FLAG_OVERRIDES[upper];
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
