import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiSearch, FiInfo, FiAlertCircle, FiWifi, FiWifiOff } from 'react-icons/fi'
import { TbMountain } from 'react-icons/tb'
import { WiThermometer, WiRaindrops } from 'react-icons/wi'
import { GiLeafSwirl } from 'react-icons/gi'
import { MdMyLocation, MdSatelliteAlt } from 'react-icons/md'
import MapSection from './MapSection'
import { callPredict, checkHealth } from '../services/predictionApi'
import type { PredictionResult } from '../types/prediction'

// ─── Loading step messages shown during GEE processing ──────────────────────
const LOADING_STEPS = [
  'Fetching satellite and environmental data...',
  'Analyzing terrain & elevation...',
  'Processing weather data...',
  'Calculating NDVI & water distance...',
  'Running suitability model...',
]

export default function PredictionDashboard() {
  const [tab, setTab] = useState<'coordinates' | 'search'>('coordinates')
  const [lat, setLat] = useState('17.9252')
  const [lng, setLng] = useState('73.6581')
  const [place, setPlace] = useState('')

  const [loading, setLoading]         = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError]             = useState<string | null>(null)

  // Backend health status
  const [health, setHealth] = useState<{ gee: boolean; model: boolean } | null>(null)

  // Default result matching the reference screenshot (shown before any prediction)
  const [result, setResult] = useState<PredictionResult>({
    label:      'Highly Suitable',
    score:      0.87,
    elevation:  1263,
    temperature: 22.4,
    rainfall:   2180,
    lat:        17.9252,
    lng:        73.6581,
    modelAvailable: false,   // will be updated after first real prediction
  })

  // Satellite image URL (separate state so it can fail independently)
  const [satImage, setSatImage]     = useState<string | null>(null)
  const [satError, setSatError]     = useState(false)

  // Poll health on mount
  useEffect(() => {
    checkHealth().then(setHealth)
  }, [])

  // ── Cycling loading messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!loading) return
    let i = 0
    setLoadingStep(LOADING_STEPS[0])
    const id = setInterval(() => {
      i = (i + 1) % LOADING_STEPS.length
      setLoadingStep(LOADING_STEPS[i])
    }, 2200)
    return () => clearInterval(id)
  }, [loading])

  // ── Predict handler ────────────────────────────────────────────────────────
  const handlePredict = async () => {
    const la = parseFloat(lat)
    const lo = parseFloat(lng)

    if (isNaN(la) || isNaN(lo)) {
      setError('Please enter valid numeric coordinates.')
      return
    }
    if (la < -90 || la > 90) {
      setError('Latitude must be between -90 and 90.')
      return
    }
    if (lo < -180 || lo > 180) {
      setError('Longitude must be between -180 and 180.')
      return
    }

    setLoading(true)
    setError(null)
    setSatError(false)
    setSatImage(null)

    try {
      const data = await callPredict(la, lo, {
        onProgress: (msg) => setLoadingStep(msg),
      })

      setResult(data)

      if (data.satelliteImage) {
        setSatImage(data.satelliteImage)
      } else {
        setSatError(true)
      }

      // Refresh health after a successful call
      checkHealth().then(setHealth)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred.'
      setError(msg)
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  // ─── Colour based on score ─────────────────────────────────────────────────
  const scoreColor = result.score === null
    ? '#6b7280'
    : result.score >= 0.8 ? '#16a34a'
    : result.score >= 0.6 ? '#22c55e'
    : result.score >= 0.4 ? '#ca8a04'
    : '#dc2626'

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        marginTop: -32,
        position: 'relative',
        zIndex: 10,
        paddingBottom: 8,
      }}
    >
      {/* ── Backend / GEE status banner ────────────────────────────────────── */}
      {health !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            padding: '7px 14px',
            borderRadius: 10,
            background: health.gee ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${health.gee ? '#bbf7d0' : '#fecaca'}`,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            color: health.gee ? '#166534' : '#991b1b',
          }}
        >
          {health.gee
            ? <FiWifi size={13} />
            : <FiWifiOff size={13} />}
          <span>
            GEE: <strong>{health.gee ? 'Connected' : 'Not connected'}</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Model: <strong>{health.model ? 'Connected' : 'Not connected — place model in backend/model/'}</strong>
          </span>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 10,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              color: '#991b1b',
            }}
          >
            <FiAlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main white card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 24,
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>

          {/* ══════════════ LEFT PANEL ══════════════ */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              padding: '20px',
              borderRight: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GiLeafSwirl size={17} style={{ color: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827' }}>
                Input Location
              </span>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              {(['coordinates', 'search'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '7px 0',
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12.5,
                    color: tab === t ? '#ffffff' : '#6b7280',
                    background: tab === t ? '#22c55e' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  {t === 'coordinates' ? 'Coordinates' : 'Search Place'}
                </button>
              ))}
            </div>

            {/* Input fields */}
            <AnimatePresence mode="wait">
              {tab === 'coordinates' ? (
                <motion.div
                  key="coords"
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.14 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {[
                    { label: 'Latitude',  val: lat, set: setLat, ph: '17.9252' },
                    { label: 'Longitude', val: lng, set: setLng, ph: '73.6581' },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#4b5563', marginBottom: 5 }}>
                        {label}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <MdMyLocation size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder={ph}
                          disabled={loading}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            paddingLeft: 28, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                            border: '1.5px solid #e5e7eb', borderRadius: 10,
                            fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151',
                            outline: 'none', transition: 'border-color 0.14s',
                            opacity: loading ? 0.6 : 1,
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.14 }}
                >
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#4b5563', marginBottom: 5 }}>
                    Place Name
                  </div>
                  <div style={{ position: 'relative' }}>
                    <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="e.g. Mahabaleshwar, India"
                      disabled={loading}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        paddingLeft: 28, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                        border: '1.5px solid #e5e7eb', borderRadius: 10,
                        fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Predict button */}
            <motion.button
              whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 6px 18px rgba(34,197,94,0.45)' }}
              whileTap={loading ? {} : { scale: 0.97 }}
              onClick={handlePredict}
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10,
                background: loading ? '#86efac' : '#22c55e',
                color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(34,197,94,0.3)',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <FiSearch size={13} />
                  Predict Suitability
                </>
              )}
            </motion.button>

            {/* Loading step text */}
            <AnimatePresence>
              {loading && loadingStep && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: '#6b7280', textAlign: 'center', marginTop: -8 }}
                >
                  {loadingStep}
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it works card */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px', display: 'flex', gap: 8 }}>
              <FiInfo size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12.5, color: '#14532d', margin: '0 0 4px 0' }}>
                  How it works?
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, lineHeight: 1.55, color: '#166534', margin: 0 }}>
                  Our model analyzes 9 different environmental and meteorological
                  factors to predict the ecotourism suitability of the given location.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT PANEL ══════════════ */}
          <div style={{ flex: 1, minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#111827' }}>
              Prediction Result
            </div>

            {/* ── 4 result cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10 }}>

              {/* Card 1 — Suitability */}
              <motion.div
                whileHover={{ y: -2, boxShadow: '0 8px 22px rgba(34,197,94,0.2)' }}
                style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '14px 16px', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'box-shadow 0.2s' }}
              >
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, color: scoreColor, lineHeight: 1.2 }}>
                  {loading ? '...' : result.label}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: '#6b7280', marginTop: 6 }}>
                  Suitability Score:{' '}
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: scoreColor }}>
                    {loading ? '—' : result.score !== null ? result.score.toFixed(2) : 'N/A'}
                  </span>{' '}
                  / 1.00
                </div>
                {result.modelAvailable === false && !loading && (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                    Model not connected
                  </div>
                )}
              </motion.div>

              {/* Card 2 — Elevation */}
              <motion.div whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '14px', minHeight: 80, transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <TbMountain size={14} style={{ color: '#9ca3af' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Elevation</span>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', lineHeight: 1 }}>
                  {loading ? '—' : result.elevation}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 3 }}>m</span>
                </div>
              </motion.div>

              {/* Card 3 — Temperature */}
              <motion.div whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '14px', minHeight: 80, transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <WiThermometer size={18} style={{ color: '#9ca3af' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Temperature</span>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', lineHeight: 1 }}>
                  {loading ? '—' : result.temperature}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 3 }}>°C</span>
                </div>
              </motion.div>

              {/* Card 4 — Rainfall */}
              <motion.div whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '14px', minHeight: 80, transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <WiRaindrops size={18} style={{ color: '#9ca3af' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Rainfall</span>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 20, color: '#111827', lineHeight: 1 }}>
                  {loading ? '—' : result.rainfall}
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 3 }}>mm/year</span>
                </div>
              </motion.div>
            </div>

            {/* ── Satellite Image ── */}
            <AnimatePresence>
              {(satImage || loading) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#f9fafb' }}
                >
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f0f0f0' }}>
                    <MdSatelliteAlt size={14} style={{ color: '#6b7280' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      Latest Available Satellite Imagery
                    </span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 10.5, color: '#9ca3af' }}>
                      Source: Sentinel-2 (Copernicus)
                    </span>
                  </div>
                  {loading ? (
                    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                      <div style={{ textAlign: 'center', color: '#6b7280', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                        <div style={{ width: 20, height: 20, border: '2px solid #e5e7eb', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
                        Generating satellite image...
                      </div>
                    </div>
                  ) : satImage ? (
                    <img
                      src={satImage}
                      alt="Latest available satellite imagery"
                      style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }}
                      onError={() => setSatError(true)}
                    />
                  ) : null}
                  {satError && !loading && (
                    <div style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                      Satellite image unavailable for this location.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Leaflet Map ── */}
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #e5e7eb', flex: 1, minHeight: 380 }}>
              <MapSection result={result} defaultLat={17.9252} defaultLng={73.6581} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.section>
  )
}
