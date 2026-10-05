/**
 * Suitability configuration — 3-class system.
 * Thresholds match extraction code section 13:
 *   score < 0.40  → 0 = Not Suitable
 *   0.40–0.70     → 1 = Moderately Suitable
 *   >= 0.70       → 2 = Suitable
 */

const FEATURE_NAMES = [
  'B4', 'B3', 'B2', 'NDVI',
  'Elevation', 'Slope',
  'WaterDistance', 'Temperature', 'Rainfall',
  'SAR_VV', 'SAR_VH',
];

const CLASS_NAMES   = ['Not Suitable', 'Moderately Suitable', 'Suitable'];
const CLASS_WEIGHTS = [0.0, 0.5, 1.0];

function classIdToLabel(classId) {
  return CLASS_NAMES[classId] ?? 'Unknown';
}

function classifyScore(score) {
  if (score >= 0.70) return 'Suitable';
  if (score >= 0.40) return 'Moderately Suitable';
  return 'Not Suitable';
}

module.exports = { FEATURE_NAMES, CLASS_NAMES, CLASS_WEIGHTS, classIdToLabel, classifyScore };
