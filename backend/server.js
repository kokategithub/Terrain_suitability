/**
 * EcoTourism Prediction Backend — Express server
 *
 * Start: node backend/server.js   (or: npm run backend)
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const { initGEE } = require('./services/geeService');
const predictRouter       = require('./routes/predict');
const { router: healthRouter, setGeeReady } = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS — only allow configured frontend origin ──────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) in development
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/health',  healthRouter);
app.use('/api/predict', predictRouter);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// ── Global error handler (never exposes internal details) ─────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  console.log('[server] Initialising Google Earth Engine...');

  try {
    await initGEE();
    setGeeReady(true);
    console.log('[server] GEE ready.');
  } catch (geeErr) {
    console.error('[server] GEE init failed:', geeErr.message);
    console.warn('[server] Server will start, but /api/predict will fail until GEE is configured.');
    // Don't crash — allow health endpoint to show gee: false
  }

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
    console.log(`[server] Health: http://localhost:${PORT}/api/health`);
    console.log(`[server] Predict: POST http://localhost:${PORT}/api/predict`);
  });
}

start();
