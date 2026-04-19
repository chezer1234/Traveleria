import { recordTiming } from '../lib/metrics.js';

// Per-request timing: adds a Server-Timing header so browser DevTools shows it
// natively, and feeds the in-memory metrics ring for /api/debug/metrics.
export default function requestTiming(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    recordTiming({ route: routeKey(req), method: req.method, status: res.statusCode, durMs });
  });
  // Header has to land before headers flush — Express lets us appendHeader late
  // but it's safer to set Server-Timing from a close-to-response hook. Stamp
  // once on `finish` via the trailer-like header isn't standard, so we
  // approximate by setting it just before send via res.setHeader at finish-1.
  const oldEnd = res.end;
  res.end = function (...args) {
    if (!res.headersSent) {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      res.setHeader('Server-Timing', `total;dur=${durMs.toFixed(1)}`);
    }
    return oldEnd.apply(this, args);
  };
  next();
}

function routeKey(req) {
  // req.route is only populated after the router matches, so fall back to the
  // raw path. The metrics ring coalesces by (method, route).
  return (req.baseUrl || '') + (req.route ? req.route.path : req.path);
}
