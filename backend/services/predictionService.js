/**
 * ML Model prediction service — Random Forest via Python child process.
 *
 * Model: scikit-learn RandomForestClassifier
 * File:  backend/model/ecotourism_model.pkl
 *
 * Feature order (MUST match FEATURE_NAMES in suitability.js):
 *   B4, B3, B2, NDVI, Slope, Elevation, WaterDistance, Temperature, Rainfall, SAR_VV, SAR_VH
 */

const { execFile } = require('child_process');
const path         = require('path');
const fs           = require('fs');
const { FEATURE_NAMES, classifyScore } = require('../config/suitability');

const MODEL_PATH  = path.resolve(__dirname, '../model/ecotourism_model.pkl');
const LABELS_PATH = path.resolve(__dirname, '../model/class_labels.pkl');
const INFER_PY    = path.resolve(__dirname, '../model/infer.py');

const modelFileExists = fs.existsSync(MODEL_PATH);

/**
 * Run inference via Python subprocess.
 * Passes the feature vector as JSON on stdin, reads JSON result on stdout.
 */
function runPythonInference(featureVector) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({ features: featureVector });

    execFile(
      'python',
      [INFER_PY],
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Python inference failed: ${stderr || error.message}`));
        }
        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) return reject(new Error(result.error));
          resolve(result);
        } catch {
          reject(new Error(`Invalid JSON from Python: ${stdout}`));
        }
      }
    ).stdin.end(input);
  });
}

/**
 * Predict suitability from normalised model features.
 * @param {object} modelFeatures
 * @returns {Promise<{score, category, modelAvailable, modelStatus}>}
 */
async function predictSuitability(modelFeatures) {
  // Build feature vector in exact trained order
  const featureVector = FEATURE_NAMES.map(name => modelFeatures[name] ?? 0);

  if (!modelFileExists) {
    return {
      score:          null,
      category:       null,
      modelAvailable: false,
      modelStatus:    'Model not connected. Run: python backend/model/train_model.py',
      featureVector,
    };
  }

  try {
    const result = await runPythonInference(featureVector);

    const score    = parseFloat(result.score.toFixed(4));
    const category = classifyScore(score);

    return {
      score,
      category,
      modelAvailable:   true,
      modelStatus:      'OK',
      predictedClass:   result.predicted_class,
      classProbabilities: result.probabilities,
      featureVector,
    };

  } catch (err) {
    console.error('[predict] Model inference error:', err.message);
    return {
      score:          null,
      category:       null,
      modelAvailable: false,
      modelStatus:    `Inference error: ${err.message}`,
      featureVector,
    };
  }
}

module.exports = { predictSuitability, modelFileExists };
