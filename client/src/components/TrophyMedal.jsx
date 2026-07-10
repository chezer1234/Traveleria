// One trophy, rendered from the shared art module (lib/trophyArt.js). The
// geometry is built as an SVG string so the identical drawing code also powers
// the static art sheet (docs/designs/trophies-1-6.html) — hence
// dangerouslySetInnerHTML on developer-authored constants, never user input.
import { useMemo } from 'react';
import { trophyMarkup, TROPHY_VIEWBOX, LOCKED_FINISH } from '../lib/trophyArt';
import { useTheme } from '../context/ThemeContext';
import { cssToken, mixHex } from '../lib/themeColors';

// Metal finishes are the achievement identity and stay fixed across styles;
// the locked "blind-embossed parchment" look is derived from the active
// theme's surfaces so it sits on Orbit's dark paper too (issue #60).
function lockedFinishForTheme() {
  const parchment = cssToken('--color-parchment');
  const panel = cssToken('--color-panel');
  const hairline = cssToken('--color-hairline');
  const ink = cssToken('--color-ink');
  if (!parchment || !panel || !hairline || !ink) return LOCKED_FINISH;
  return {
    deep: mixHex(parchment, ink, 0.1),
    mid: parchment,
    hi: mixHex(parchment, panel, 0.65),
    edge: hairline,
    engrave: mixHex(hairline, ink, 0.12),
  };
}

export default function TrophyMedal({ shape, tier, earned, glyph, name, className = 'w-20 h-auto' }) {
  const { theme } = useTheme();
  const markup = useMemo(
    () => trophyMarkup(shape, {
      tier,
      earned,
      glyph,
      finish: earned ? null : lockedFinishForTheme(),
    }),
    // `theme` re-resolves the locked finish when the style switches.
    [shape, tier, earned, glyph, theme],
  );
  return (
    <svg
      viewBox={TROPHY_VIEWBOX}
      className={className}
      role="img"
      aria-label={`${name} — ${earned ? 'earned' : 'locked'}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
