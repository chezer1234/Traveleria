require('dotenv').config();
const express = require('express');
const cors = require('cors');

const countriesRoutes = require('./routes/countries');
const usersRoutes = require('./routes/users');

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

app.listen(PORT, () => {
  console.log(`TravelPoints server running on port ${PORT}`);
});

module.exports = app;
