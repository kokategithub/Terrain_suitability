/**
 * Centralised suitability configuration.
 * All thresholds and feature definitions live here.
 * Import this everywhere — never scatter thresholds in components.
 */

/** Exact feature order the ML model was trained on (must never change). */
const FEATURE_NAMES = [
  'B4',
  'B3',
  'B2',
  'NDVI',
  'Slope',
  'Elevation',
  'WaterDistance',
  'Temperature',
  'Rainfall',
  'SAR_VV',
  'SAR_VH',
];

/** Suitability score → category thresholds. */
const THRESHOLDS = {
  HIGHLY_SUITABLE: 0.80,
  SUITABLE:        0.60,
  MODERATE:        0.40,
};

/**
 * Classify a 0–1 score into a human-readable category.
 * @param {number} score
 * @returns {string}
 */
function classifyScore(score) {
  if (score >= THRESHOLDS.HIGHLY_SUITABLE) return 'Highly Suitable';
  if (score >= THRESHOLDS.SUITABLE)        return 'Suitable';
  if (score >= THRESHOLDS.MODERATE)        return 'Moderately Suitable';
  return 'Low Suitability';
}

module.exports = { FEATURE_NAMES, THRESHOLDS, classifyScore };
