const { APP_SCHEMA_VERSION } = require('../lib/schema-version');

module.exports = function schemaVersionHeader(req, res, next) {
  res.setHeader('X-App-Schema-Version', APP_SCHEMA_VERSION);
  next();
};
