/**
 * Centralised suitability configuration — 3-class system.
 *
 * Classes match Attention U-Net mask encoding:
 *   0 = Not Suitable        (BLACK)
 *   1 = Moderately Suitable (YELLOW)
 *   2 = Suitable            (GREEN)
 */

const FEATURE_NAMES = [
  'B4', 'B3', 'B2', 'NDVI', 'Slope',
  'Elevation', 'WaterDistance', 'Temperature', 'Rainfall',
  'SAR_VV', 'SAR_VH',
];

const CLASS_NAMES   = ['Not Suitable', 'Moderately Suitable', 'Suitable'];
const CLASS_WEIGHTS = [0.0, 0.5, 1.0];

/**
 * Map class_id → human label.
 * Used when the model returns a class_id directly.
 */
function classIdToLabel(classId) {
  return CLASS_NAMES[classId] ?? 'Unknown';
}

/**
 * Map a 0-1 score → category label.
 * Used as a fallback when only a score is available.
 */
function classifyScore(score) {
  if (score >= 0.75) return 'Suitable';
  if (score >= 0.25) return 'Moderately Suitable';
  return 'Not Suitable';
}

module.exports = { FEATURE_NAMES, CLASS_NAMES, CLASS_WEIGHTS, classIdToLabel, classifyScore };
