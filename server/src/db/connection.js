import knex from 'knex';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const knexfile = require('./knexfile.cjs');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

if (!config) {
  throw new Error(`No knex configuration found for environment: ${environment}`);
}

export default knex(config);
