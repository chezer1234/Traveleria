// One trophy, rendered from the shared art module (lib/trophyArt.js). The
// geometry is built as an SVG string so the identical drawing code also powers
// the static art sheet (docs/designs/trophies-1-6.html) — hence
// dangerouslySetInnerHTML on developer-authored constants, never user input.
import { useMemo } from 'react';
import { trophyMarkup, TROPHY_VIEWBOX } from '../lib/trophyArt';

export default function TrophyMedal({ shape, tier, earned, glyph, name, className = 'w-20 h-auto' }) {
  const markup = useMemo(
    () => trophyMarkup(shape, { tier, earned, glyph }),
    [shape, tier, earned, glyph],
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
