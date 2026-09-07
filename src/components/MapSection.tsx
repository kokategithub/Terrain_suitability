import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { legendItems } from '../data/factors'
import type { PredictionResult } from '../types/prediction'

// Fix bundler-broken default Leaflet icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Pan/zoom to new location when result updates
function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    map.flyTo([lat, lng], 10, { duration: 1.2 })
  }, [lat, lng, map])
  return null
}

// Canvas heatmap overlay — suitability gradient circles
function HeatmapOverlay({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    // Draw from outermost (red) to innermost (dark green) so core is on top
    const rings = [
      { color: '#dc2626', opacity: 0.22, mult: 1.35 },
      { color: '#f97316', opacity: 0.28, mult: 1.12 },
      { color: '#eab308', opacity: 0.32, mult: 0.90 },
      { color: '#4ade80', opacity: 0.40, mult: 0.65 },
      { color: '#16a34a', opacity: 0.52, mult: 0.42 },
    ]

    const BASE_RADIUS = 20000 // metres
    const circles = rings.map(({ color, opacity, mult }) =>
      L.circle([lat, lng], {
        radius: BASE_RADIUS * mult,
        stroke: false,
        fillColor: color,
        fillOpacity: opacity,
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(map),
    )

    return () => circles.forEach((c) => c.remove())
  }, [lat, lng, map])

  return null
}

interface MapSectionProps {
  result: PredictionResult | null
  defaultLat: number
  defaultLng: number
}

export default function MapSection({ result, defaultLat, defaultLng }: MapSectionProps) {
  const lat = result?.lat ?? defaultLat
  const lng = result?.lng ?? defaultLng

  return (
    <div className="relative w-full" style={{ height: '400px' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={10}
        style={{ height: '100%', width: '100%', background: '#e8f4e8' }}
        zoomControl
        scrollWheelZoom
      >
        {/*
          Primary: Esri satellite
          Fallback: OpenTopoMap (terrain look that closely matches reference heatmap colours)
        */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
          maxZoom={19}
          errorTileUrl="https://tile.opentopomap.org/{z}/{x}/{y}.png"
        />

        <HeatmapOverlay lat={lat} lng={lng} />

        <Marker position={[lat, lng]}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 2 }}>
                {result ? result.label : 'Selected Location'}
              </div>
              <div style={{ color: '#374151' }}>
                Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
              </div>
              {result && (
                <>
                  <div style={{ color: '#374151' }}>
                    Score: <strong>{result.score != null ? result.score.toFixed(2) : 'N/A'}</strong>
                  </div>
                  <div style={{ color: '#374151' }}>
                    Elevation: <strong>{result.elevation} m</strong>
                  </div>
                </>
              )}
            </div>
          </Popup>
        </Marker>

        <MapController lat={lat} lng={lng} />
      </MapContainer>

      {/* Suitability Legend — floats over bottom-right of map */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '172px',
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '7px',
          }}
        >
          Suitability Index
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {legendItems.map((item) => (
            <div key={item.level} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div
                style={{
                  width: 14,
                  height: 12,
                  borderRadius: 3,
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#374151',
                }}
              >
                {item.label}{' '}
                <span style={{ color: '#9ca3af', fontSize: '10.5px' }}>{item.range}</span>
              </span>
            </div>
          ))}
        </div>
        {/* Layers toggle icon */}
        <div
          style={{
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
