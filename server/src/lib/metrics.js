// Tiny in-memory metrics ring. No dependencies, no histograms — we just want
// p50/p95 for the last N requests per (method, route). Good enough at hobby
// scale; swap for prometheus-client the day we care about multi-process.

const RING_SIZE = 500;
const byRoute = new Map();

export function recordTiming({ route, method, status, durMs }) {
  const key = `${method} ${route}`;
  let slot = byRoute.get(key);
  if (!slot) {
    slot = { count: 0, statusCounts: {}, samples: [] };
    byRoute.set(key, slot);
  }
  slot.count += 1;
  slot.statusCounts[status] = (slot.statusCounts[status] || 0) + 1;
  slot.samples.push(durMs);
  if (slot.samples.length > RING_SIZE) slot.samples.shift();
}

export function snapshot() {
  const out = {};
  for (const [key, slot] of byRoute) {
    const sorted = [...slot.samples].sort((a, b) => a - b);
    out[key] = {
      count: slot.count,
      status: slot.statusCounts,
      p50_ms: pct(sorted, 0.5),
      p95_ms: pct(sorted, 0.95),
      p99_ms: pct(sorted, 0.99),
    };
  }
  return out;
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return Math.round(sorted[idx] * 10) / 10;
}
