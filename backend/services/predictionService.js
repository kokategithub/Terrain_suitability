/**
<<<<<<< HEAD
 * ML Model prediction service — Attention U-Net ONLY.
 * No Random Forest.
 *
 * Prediction score uses fuzzy membership functions from extraction code.
 * Segmentation visual uses Attention U-Net pixel-level output.
 *
 * 3-class output:
 *   0 = Not Suitable        (BLACK)   score < 0.40
 *   1 = Moderately Suitable (YELLOW)  0.40 <= score < 0.70
 *   2 = Suitable            (GREEN)   score >= 0.70
=======
 * ML Model prediction service.
 *
 * Uses Attention U-Net ONLY (attention_unet_dice_ce_best.pth).
 * No Random Forest — U-Net handles both prediction score and segmentation.
 *
 * 3-class output:
 *   class_id 0 = Not Suitable        (BLACK)
 *   class_id 1 = Moderately Suitable (YELLOW)
 *   class_id 2 = Suitable            (GREEN)
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
 */

const { execFile } = require('child_process');
const path         = require('path');
const fs           = require('fs');
const { FEATURE_NAMES, classIdToLabel, classifyScore } = require('../config/suitability');

const UNET_PATH = path.resolve(__dirname, '../model/attention_unet_dice_ce_best.pth');
const INFER_PY  = path.resolve(__dirname, '../model/infer.py');

const modelFileExists = fs.existsSync(UNET_PATH);

<<<<<<< HEAD
function runPythonInference(featureVector, imagePatch, rawFeatures) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({
      features:     featureVector,
      image_patch:  imagePatch   ?? null,
      raw_features: rawFeatures  ?? null,   // for explanation generation
=======
function runPythonInference(featureVector, imagePatch) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({
      features:    featureVector,
      image_patch: imagePatch ?? null,
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
    });
    const child = execFile(
      'python', [INFER_PY],
      { timeout: 120000 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(`Inference failed: ${stderr || error.message}`));
        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) return reject(new Error(result.error));
          resolve(result);
        } catch {
          reject(new Error(`Invalid JSON from Python: ${stdout}`));
        }
      }
    );
    child.stdin.end(input);
  });
}

<<<<<<< HEAD
async function predictSuitability(modelFeatures, imagePatch, rawFeatures) {
=======
async function predictSuitability(modelFeatures, imagePatch) {
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
  const featureVector = FEATURE_NAMES.map(name => modelFeatures[name] ?? 0);

  if (!modelFileExists) {
    return {
      score:          null,
      category:       null,
      class_id:       null,
      modelAvailable: false,
      modelStatus:    'Model not found. Place attention_unet_dice_ce_best.pth in backend/model/',
      featureVector,
    };
  }

  try {
<<<<<<< HEAD
    const result = await runPythonInference(featureVector, imagePatch, rawFeatures);
=======
    const result = await runPythonInference(featureVector, imagePatch);
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56

    const score    = parseFloat(result.score.toFixed(4));
    const class_id = result.class_id ?? null;
    const category = result.predicted_class
      ?? (class_id != null ? classIdToLabel(class_id) : classifyScore(score));

    return {
      score,
      category,
      class_id,
      modelAvailable:     true,
      modelStatus:        'OK',
      predictedClass:     category,
      classProbabilities: result.probabilities ?? {},
      segmentationImage:  result.segmentation_image ?? null,
<<<<<<< HEAD
      explanation:        result.explanation        ?? null,   // feature-based explanation
=======
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
      featureVector,
    };

  } catch (err) {
<<<<<<< HEAD
    console.error('[predict] U-Net inference error:', err.message);
=======
    console.error('[predict] Attention U-Net inference error:', err.message);
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
    return {
      score:          null,
      category:       null,
      class_id:       null,
      modelAvailable: false,
      modelStatus:    `Inference error: ${err.message}`,
      featureVector,
    };
  }
}

module.exports = { predictSuitability, modelFileExists };
