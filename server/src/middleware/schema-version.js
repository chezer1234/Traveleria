import { APP_SCHEMA_VERSION } from '../lib/schema-version.js';

export default function schemaVersionHeader(req, res, next) {
  res.setHeader('X-App-Schema-Version', APP_SCHEMA_VERSION);
  next();
}
