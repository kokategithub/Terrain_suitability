/**
 * GET /api/health
 * Health check — used by frontend and monitoring.
 */

const express = require('express');
const { modelFileExists } = require('../services/predictionService');

const router = express.Router();

let geeReady = false;

/** Called from server.js after GEE initialises. */
function setGeeReady(v) { geeReady = v; }

router.get('/', (_req, res) => {
  res.json({
    success: true,
    gee:     geeReady,
    model:   modelFileExists,
    time:    new Date().toISOString(),
  });
});

module.exports = { router, setGeeReady };
