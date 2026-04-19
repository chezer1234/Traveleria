import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db/connection.js';
import schemaVersionHeader from './middleware/schema-version.js';
import coopCoep from './middleware/coop-coep.js';
import { APP_SCHEMA_VERSION } from './lib/schema-version.js';
import requestTiming from './middleware/request-timing.js';

import countriesRoutes from './routes/countries.js';
import usersRoutes from './routes/users.js';
import leaderboardRoutes from './routes/leaderboard.js';
import authRoutes from './routes/auth.js';
import changesRoutes from './routes/changes.js';
import snapshotRoutes from './routes/snapshot.js';
import debugRoutes from './routes/debug.js';
import devRoutes from './routes/dev.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(schemaVersionHeader);
app.use(coopCoep);
app.use(requestTiming);
app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('/{*path}', cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const info = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    db: 'unknown',
  };

  // Test DB connectivity
  try {
    const start = Date.now();
    const result = await db('countries').count('* as count').first();
    info.db = 'connected';
    info.dbLatency = Date.now() - start + 'ms';
    info.countries = parseInt(result.count, 10);
  } catch (err) {
    info.db = 'error';
    info.dbError = err.message;
  }

  res.json(info);
});

// Diagnostic endpoint — test different query types against Turso
app.get('/api/debug/db', async (req, res) => {
  const results = {};

  try {
    let start = Date.now();
    const count = await db('countries').count('* as count').first();
    results.count = { ok: true, ms: Date.now() - start, value: count.count };
  } catch (e) {
    results.count = { ok: false, error: e.message };
  }

  try {
    let start = Date.now();
    const one = await db('countries').where({ code: 'GB' }).first();
    results.selectOne = { ok: true, ms: Date.now() - start, name: one?.name };
  } catch (e) {
    results.selectOne = { ok: false, error: e.message };
  }

  try {
    let start = Date.now();
    const five = await db('countries').limit(5);
    results.selectFive = { ok: true, ms: Date.now() - start, count: five.length };
  } catch (e) {
    results.selectFive = { ok: false, error: e.message };
  }

  try {
    let start = Date.now();
    const all = await db('countries').select('code', 'name');
    results.selectAll = { ok: true, ms: Date.now() - start, count: all.length };
  } catch (e) {
    results.selectAll = { ok: false, error: e.message };
  }

  try {
    let start = Date.now();
    const raw = await db.raw('SELECT code, name FROM countries LIMIT 3');
    results.raw = { ok: true, ms: Date.now() - start, rows: raw };
  } catch (e) {
    results.raw = { ok: false, error: e.message };
  }

  try {
    let start = Date.now();
    const allCols = await db('countries')
      .select('code', 'name', 'region', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng')
      .orderBy('name');
    results.selectExplicitCols = { ok: true, ms: Date.now() - start, count: allCols.length, sample: allCols[0] };
  } catch (e) {
    results.selectExplicitCols = { ok: false, error: e.message };
  }

  res.json(results);
});

app.use('/api/auth', authRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/changes', changesRoutes);
app.use('/api/snapshot', snapshotRoutes);
app.use('/api/debug', debugRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// In production, serve the built React frontend if available
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist));
    app.get('/{*path}', (req, res) => {
      res.sendFile(indexHtml);
    });
  }
}

async function start() {
  console.log('Running migrations...');
  await db.migrate.latest();
  console.log('Running seeds...');
  await db.seed.run();
  console.log('Database ready.');

  app.listen(PORT, () => {
    console.log(`TravelPoints server running on port ${PORT} (schema ${APP_SCHEMA_VERSION})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
