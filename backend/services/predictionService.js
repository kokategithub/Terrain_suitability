/**
 * ML Model prediction service.
 *
 * Uses Attention U-Net ONLY (attention_unet_dice_ce_best.pth).
 * No Random Forest — U-Net handles both prediction score and segmentation.
 *
 * 3-class output:
 *   class_id 0 = Not Suitable        (BLACK)
 *   class_id 1 = Moderately Suitable (YELLOW)
 *   class_id 2 = Suitable            (GREEN)
 */

const { execFile } = require('child_process');
const path         = require('path');
const fs           = require('fs');
const { FEATURE_NAMES, classIdToLabel, classifyScore } = require('../config/suitability');

const UNET_PATH = path.resolve(__dirname, '../model/attention_unet_dice_ce_best.pth');
const INFER_PY  = path.resolve(__dirname, '../model/infer.py');

const modelFileExists = fs.existsSync(UNET_PATH);

function runPythonInference(featureVector, imagePatch) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({
      features:    featureVector,
      image_patch: imagePatch ?? null,
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

async function predictSuitability(modelFeatures, imagePatch) {
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
    const result = await runPythonInference(featureVector, imagePatch);

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
      featureVector,
    };

  } catch (err) {
    console.error('[predict] Attention U-Net inference error:', err.message);
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
