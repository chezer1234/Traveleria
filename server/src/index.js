require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db/connection');

const countriesRoutes = require('./routes/countries');
const usersRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('/{*path}', cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/countries', countriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

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
    console.log(`TravelPoints server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
