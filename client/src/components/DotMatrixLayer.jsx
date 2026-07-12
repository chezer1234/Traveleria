import { useMemo } from 'react';
import { geoContains } from 'd3-geo';

/**
 * Dot-matrix world map layer (issue #63 — Orbit's signature rendering).
 *
 * Reproduces docs/designs/concept-2-orbit.html: land drawn as a uniform grid
 * of dots (the mockup pre-baked circles on a 9-unit pitch, r 3.1 — a ~0.69
 * dot/pitch ratio), coloured by each country's visited/ownership state.
 *
 * Renders inside a <Geographies> render-prop, which supplies the live
 * projection + path. For every feature we scan the grid cells inside its
 * projected bounding box, invert each cell centre back to [lng, lat] and keep
 * it if the point is inside the polygon (d3 geoContains). Dot positions are
 * memoised — they depend only on geometry + projection, not on visit state —
 * so state changes just re-class the dots.
 *
 * This layer is purely presentational: the caller keeps its transparent
 * <Geography> paths on top for hover/click/zoom, so interactivity is
 * identical to the polygon render.
 */

const DOT_STATES = ['visited', 'unvisited', 'explore', 'dim', 'you', 'them', 'contested', 'none'];

export default function DotMatrixLayer({
  geographies,
  path,
  projection,
  stateFor,
  width = 800,
  height = 600,
  step = 8,
}) {
  const dots = useMemo(() => {
    if (!projection || typeof projection.invert !== 'function') return [];
    const seen = new Set();
    const out = [];
    for (const geo of geographies) {
      const b = path.bounds(geo);
      // Clamp to the viewport — antimeridian features (Russia, Fiji) project
      // to huge boxes, and zoomed projections (Europe view) push most
      // features off-canvas.
      const x0 = Math.max(0, b[0][0]);
      const y0 = Math.max(0, b[0][1]);
      const x1 = Math.min(width, b[1][0]);
      const y1 = Math.min(height, b[1][1]);
      if (x1 < x0 || y1 < y0) continue;
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
        for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
          const key = x * 100000 + y;
          if (seen.has(key)) continue;
          const ll = projection.invert([x, y]);
          if (!ll) continue;
          // invert() extrapolates outside the projection's world outline —
          // a round-trip check rejects those phantom coordinates.
          const rt = projection(ll);
          if (!rt || Math.abs(rt[0] - x) > 0.5 || Math.abs(rt[1] - y) > 0.5) continue;
          if (!geoContains(geo, ll)) continue;
          seen.add(key);
          out.push({ x, y, geo });
        }
      }
    }
    return out;
  }, [geographies, path, projection, width, height, step]);

  // Group per state so the glow filter applies once per <g>, not per circle
  // (thousands of per-element SVG filters would crawl).
  const groups = useMemo(() => {
    const byState = new Map(DOT_STATES.map((s) => [s, []]));
    for (const dot of dots) {
      const state = stateFor(dot.geo);
      (byState.get(state) || byState.get('unvisited')).push(dot);
    }
    return [...byState].filter(([, pts]) => pts.length > 0);
  }, [dots, stateFor]);

  const r = step * 0.35;

  return (
    <g className="dot-layer" aria-hidden="true">
      {groups.map(([state, pts]) => (
        <g key={state} className={`dt-${state}`}>
          {pts.map((p) => (
            <circle key={p.x * 100000 + p.y} cx={p.x} cy={p.y} r={r} />
          ))}
        </g>
      ))}
    </g>
  );
}
