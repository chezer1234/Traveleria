// Hand-rolled SVG line chart for the Stats page's points-over-time graph
// (issue #75, phase 1) — no charting library in this codebase (see
// client/src/pages/Map.jsx / GroupBattle.jsx for the equivalent hand-rolled
// SVG pattern used for maps). X is a real time scale, not just point index,
// so a long gap between trips reads as a flat stretch of line, not evenly
// spaced steps — that's what makes it a history, not a bar chart.
import { useState, useMemo, useRef } from 'react';

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PointsHistoryChart({ history }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const { points, maxPoints } = useMemo(() => {
    if (!history.length) return { points: [], maxPoints: 0 };
    const times = history.map((h) => new Date(h.date).getTime());
    const minDate = Math.min(...times);
    const maxDate = Math.max(...times);
    const maxPoints = Math.max(...history.map((h) => h.totalPoints), 1);
    const span = maxDate - minDate || 1;
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const points = history.map((h, i) => {
      const t = new Date(h.date).getTime();
      const x = PAD.left + (history.length === 1 ? innerW / 2 : ((t - minDate) / span) * innerW);
      const y = PAD.top + innerH - (h.totalPoints / maxPoints) * innerH;
      return { x, y, ...h, i };
    });
    return { points, maxPoints };
  }, [history]);

  if (history.length === 0) return null;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const baselineY = PAD.top + (HEIGHT - PAD.top - PAD.bottom);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  function handleMove(e) {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHoverIndex(closest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Cumulative travel points over time"
      >
        {/* Y-axis gridlines + labels: 0, half, max */}
        {[0, 0.5, 1].map((frac) => {
          const y = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - frac);
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={WIDTH - PAD.right} y2={y} stroke="var(--color-hairline)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--color-ink-soft)">
                {fmt(maxPoints * frac)}
              </text>
            </g>
          );
        })}

        {/* Area fill + line */}
        <path d={areaPath} fill="var(--color-compass)" fillOpacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-compass)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Start / end date labels */}
        <text x={points[0].x} y={HEIGHT - 8} textAnchor="start" fontSize={10} fill="var(--color-ink-soft)">
          {fmtDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={points[points.length - 1].x} y={HEIGHT - 8} textAnchor="end" fontSize={10} fill="var(--color-ink-soft)">
            {fmtDate(points[points.length - 1].date)}
          </text>
        )}

        {/* Hover crosshair + dot */}
        {hovered && (
          <g>
            <line x1={hovered.x} y1={PAD.top} x2={hovered.x} y2={baselineY} stroke="var(--color-ink-soft)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--color-compass)" stroke="var(--color-panel)" strokeWidth={1.5} />
          </g>
        )}
        {!hovered && points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill="var(--color-compass)" stroke="var(--color-panel)" strokeWidth={1.5} />
        )}
      </svg>

      {hovered && (
        <div
          className="absolute bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: `${Math.max(0, (hovered.y / HEIGHT) * 100 - 14)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {fmtDate(hovered.date)} · {fmt(hovered.totalPoints)} pts
        </div>
      )}
    </div>
  );
}
