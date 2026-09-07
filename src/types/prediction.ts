// ─── UI result (what components render) ────────────────────────────────────
export interface PredictionResult {
  label: string
  score: number | null
  elevation: number
  temperature: number
  rainfall: number
  lat: number
  lng: number
  // Extended fields from real GEE/model response
  ndvi?: number | null
  slope?: number | null
  waterDistance?: number | null
  sarVV?: number | null
  sarVH?: number | null
  satelliteImage?: string | null
  modelAvailable?: boolean
  modelStatus?: string
}

// ─── Raw API response shapes ────────────────────────────────────────────────
export interface RawFeatures {
  B4: number | null
  B3: number | null
  B2: number | null
  NDVI: number | null
  Slope: number
  Elevation: number
  WaterDistance: number
  Temperature: number
  Rainfall: number
  SAR_VV: number | null
  SAR_VH: number | null
}

export interface ModelFeatures {
  B4: number
  B3: number
  B2: number
  NDVI: number
  Slope: number
  Elevation: number
  WaterDistance: number
  Temperature: number
  Rainfall: number
  SAR_VV: number
  SAR_VH: number
}

export interface Prediction {
  score: number | null
  category: string | null
  modelAvailable: boolean
  modelStatus?: string
  featureVector?: number[]
}

export interface ApiPredictResponse {
  success: boolean
  cached?: boolean
  error?: string
  data?: {
    location: { latitude: number; longitude: number }
    satelliteImage: string
    rawFeatures: RawFeatures
    modelFeatures: ModelFeatures
    prediction: Prediction
  }
}

// ─── Other existing types ────────────────────────────────────────────────────
export interface TabType {
  id: 'coordinates' | 'search'
  label: string
}

export interface FactorCard {
  id: string
  icon: string
  title: string
  subtitle: string
}

export type SuitabilityLevel = 'very-high' | 'high' | 'moderate' | 'low' | 'very-low'

export interface SuitabilityLegendItem {
  level: SuitabilityLevel
  label: string
  range: string
  color: string
}
