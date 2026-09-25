import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { baseStyleUrl, defaultBounds } from '../../map/config'
import { metrics, track } from '../../telemetry'
import { ContourLayer } from './layers/ContourLayer'
import { HillshadeLayer } from './layers/HillshadeLayer'
import { RouteLayer } from './layers/RouteLayer'
import { TrailsLayer } from './layers/TrailsLayer'

const loadDuration = metrics.histogram('steer.app.load_duration_ms', {
  description: 'Time from navigation start until the map first finishes loading',
  advice: {
    explicitBucketBoundaries: [250, 500, 1000, 1500, 2000, 3000, 5000, 8000, 13000, 20000],
  },
})

// Reported once per page load, even if the map remounts (e.g. StrictMode).
let loadReported = false

function reportLoaded() {
  if (loadReported) return
  loadReported = true
  const loadMs = Math.round(performance.now())
  track('app.loaded', { map_load_ms: loadMs })
  loadDuration.record(loadMs)
}

export function MapView() {
  return (
    <Map
      initialViewState={{ bounds: defaultBounds }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={baseStyleUrl}
      onLoad={reportLoaded}
    >
      <HillshadeLayer />
      <ContourLayer />
      <TrailsLayer />
      <RouteLayer />
    </Map>
  )
}
