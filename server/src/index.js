require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db/connection');
const schemaVersionHeader = require('./middleware/schema-version');
const coopCoep = require('./middleware/coop-coep');
const { APP_SCHEMA_VERSION } = require('./lib/schema-version');

const countriesRoutes = require('./routes/countries');
const usersRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(schemaVersionHeader);
app.use(coopCoep);
app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('/{*path}', cors());
app.use(express.json());
app.use(cookieParser());

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

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', require('./routes/dev'));
}

// In production, serve the built React frontend if available
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
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

module.exports = app;
