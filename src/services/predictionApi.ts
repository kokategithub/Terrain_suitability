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

<<<<<<< HEAD
  // GEE + U-Net can take up to 3 minutes — use AbortController with 3min timeout
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 180000)

  let response: Response
  try {
    response = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. GEE is taking too long — please try again.')
    }
    throw new Error('Failed to connect to backend. Make sure the server is running.')
  } finally {
    clearTimeout(timeoutId)
  }
=======
  const response = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  })
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56

  const json: ApiPredictResponse = await response.json()

  // Backend returned a user-facing error (e.g. outside India, no imagery)
  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Prediction failed. Please try again.')
  }

  const { rawFeatures, prediction, satelliteImage, segmentationImage } = json.data

  onProgress?.('Building result...')

  // Map API response → UI PredictionResult
  const result: PredictionResult = {
    lat,
    lng,
    label:          prediction.category   ?? 'Unknown',
    class_id:       prediction.class_id   ?? null,
    score:          prediction.score,
    elevation:      rawFeatures.Elevation,
    temperature:    rawFeatures.Temperature,
    rainfall:       rawFeatures.Rainfall,
    ndvi:           rawFeatures.NDVI,
    slope:          rawFeatures.Slope,
    waterDistance:  rawFeatures.WaterDistance,
    sarVV:          rawFeatures.SAR_VV,
    sarVH:          rawFeatures.SAR_VH,
    satelliteImage:    satelliteImage    ?? null,
    segmentationImage: segmentationImage ?? null,
<<<<<<< HEAD
    explanation:       prediction.explanation ?? null,
=======
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
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
