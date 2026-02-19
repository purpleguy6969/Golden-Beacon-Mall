const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, syncShops } = require('./config/database');

const app = express();

// Security headers (contentSecurityPolicy disabled so frontend scripts load fine)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS - allow all origins
app.use(cors({ origin: '*', credentials: true }));

// Serve the frontend folder as static files
// Visiting http://localhost:5000 opens your website automatically!
app.use(express.static(path.join(__dirname, '../frontend')));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - prevents spam/abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes.' }
});
app.use('/api/', limiter);

// Start database on server boot
(async () => {
  try {
    await initializeDatabase();
    await syncShops();
    console.log('✓ Database ready');
  } catch (err) {
    console.error('Database startup error:', err);
  }
})();

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/ban-appeals', require('./routes/banAppeals'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/public', require('./routes/public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Golden Beacon Mall API is running!' });
});

// Serve index.html for everything else
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     Golden Beacon Mall - Server Running       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Open this in your browser:');
  console.log('  --> http://localhost:' + PORT);
  console.log('');
  console.log('Press Ctrl+C to stop.');
  console.log('');
});
