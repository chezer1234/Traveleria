// Matches nginx.conf so the dev Vite server and the prod nginx bundle both satisfy
// SharedArrayBuffer + OPFS Worker requirements. Required from Phase 2 onwards; harmless now.

module.exports = function coopCoep(req, res, next) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
};
