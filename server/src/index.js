require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const countriesRoutes = require('./routes/countries');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use((req, res, next) => { if (req.body === undefined) req.body = {}; next(); });
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/users', usersRoutes);

app.listen(PORT, () => {
  console.log(`TravelPoints server running on port ${PORT}`);
});

module.exports = app;
