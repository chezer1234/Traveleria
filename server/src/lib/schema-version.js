// Single source of truth for APP_SCHEMA_VERSION on the server.
// The value is baked at Docker build time via ARG APP_SCHEMA_VERSION (a short git SHA in CI).
// Locally the default is the string "dev" so OPFS isn't wiped on every code save.
// Any mismatch between server-sent X-App-Schema-Version and the client's baked
// VITE_APP_SCHEMA_VERSION triggers a full OPFS wipe + hard reload on the client.

export const APP_SCHEMA_VERSION = process.env.APP_SCHEMA_VERSION || 'dev';
