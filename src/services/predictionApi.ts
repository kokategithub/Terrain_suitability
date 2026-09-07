/**
 * Frontend API service — calls POST /api/predict
 * Never puts GEE credentials here. Credentials live only on the backend.
 */

import type { ApiPredictResponse, PredictionResult } from '../types/prediction'

const API_BASE = '/api'   // Vite proxies /api → http://localhost:3001

export interface PredictOptions {
  onProgress?: (message: string) => void
}

/**
 * Call the backend prediction endpoint and transform the response
 * into the PredictionResult shape the UI already understands.
 */
export async function callPredict(
  lat: number,
  lng: number,
  options: PredictOptions = {},
): Promise<PredictionResult> {
  const { onProgress } = options

  onProgress?.('Validating coordinates...')

  const response = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  })

  const json: ApiPredictResponse = await response.json()

  // Backend returned a user-facing error (e.g. outside India, no imagery)
  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Prediction failed. Please try again.')
  }

  const { rawFeatures, prediction, satelliteImage } = json.data

  onProgress?.('Building result...')

  // Map API response → UI PredictionResult
  const result: PredictionResult = {
    lat,
    lng,
    // Suitability — show "Model not connected" gracefully
    label:          prediction.category   ?? 'Model not connected',
    score:          prediction.score,

    // Display values from raw (human-readable) features
    elevation:      rawFeatures.Elevation,
    temperature:    rawFeatures.Temperature,
    rainfall:       rawFeatures.Rainfall,
    ndvi:           rawFeatures.NDVI,
    slope:          rawFeatures.Slope,
    waterDistance:  rawFeatures.WaterDistance,
    sarVV:          rawFeatures.SAR_VV,
    sarVH:          rawFeatures.SAR_VH,

    // Satellite image URL from GEE thumbnail
    satelliteImage: satelliteImage ?? null,

    // Model status flags
    modelAvailable: prediction.modelAvailable,
    modelStatus:    prediction.modelStatus,
  }

  return result
}

/** Simple health check — used to show backend status in UI */
export async function checkHealth(): Promise<{ gee: boolean; model: boolean }> {
  try {
    const res  = await fetch(`${API_BASE}/health`)
    const json = await res.json()
    return { gee: json.gee ?? false, model: json.model ?? false }
  } catch {
    return { gee: false, model: false }
  }
}
