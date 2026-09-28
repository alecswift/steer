import { useState } from 'react'
import Map, { AttributionControl, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { SatelliteLayer } from '@/features/imagery/SatelliteLayer'
import { peakFromFeature, type Peak } from '@/features/peaks/peak'
import { PeakLayer } from '@/features/peaks/PeakLayer'
import { peakLayerId } from '@/features/peaks/peaks.style'
import { RouteLayer } from '@/features/routes/RouteLayer'
import { ContourLayer } from '@/features/terrain/ContourLayer'
import { HillshadeLayer } from '@/features/terrain/HillshadeLayer'
import { TrailsLayer } from '@/features/trails/TrailsLayer'
import { baseStyleUrl, defaultBounds } from '@/map/config'
import { metrics, track } from '@/telemetry'

const loadDuration = metrics.histogram('steer.app.load_duration_ms', {
  description: 'Time from navigation start until the map first finishes loading',
  advice: {
    explicitBucketBoundaries: [250, 500, 1000, 1500, 2000, 3000, 5000, 8000, 13000, 20000],
  },
})

// Reported once per page load, even if the map remounts (e.g. StrictMode).
let loadReported = false

/** Records the time since navigation began when the map loads, once per page load. */
function reportLoaded() {
  if (loadReported) return
  loadReported = true
  const loadMs = Math.round(performance.now())
  track('app.loaded', { map_load_ms: loadMs })
  loadDuration.record(loadMs)
}

const interactiveLayerIds = [peakLayerId]

// The sidebar floats over the map's right edge, or its bottom on narrow
// screens (see Sidebar.css), so the default view is framed in the space
// beside it. Read once, since it only sets the first view.
function defaultViewPadding() {
  const narrow = window.matchMedia('(max-width: 40rem)').matches
  return narrow ? { top: 24, right: 24, bottom: 140, left: 24 } : { top: 32, right: 416, bottom: 32, left: 32 }
}

type Props = {
  // `at` is the click's DOM timestamp, on the performance.now() timeline.
  onPeakClick: (peak: Peak, at: number) => void
  onEmptyClick: () => void
}

/** Renders the map layers and forwards peak or empty-map clicks to the selection callbacks. */
export function MapView({ onPeakClick, onEmptyClick }: Props) {
  const [hovering, setHovering] = useState(false)

  /**
   * Reads the first interactive peak feature and forwards it with the DOM click timestamp.
   * Calls onEmptyClick when the click has no valid peak feature.
   */
  function handleClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0]
    const peak = feature ? peakFromFeature(feature) : null
    if (peak) onPeakClick(peak, e.originalEvent.timeStamp)
    else onEmptyClick()
  }

  return (
    <Map
      initialViewState={{ bounds: defaultBounds, fitBoundsOptions: { padding: defaultViewPadding() } }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={baseStyleUrl}
      onLoad={reportLoaded}
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      cursor={hovering ? 'pointer' : undefined}
      attributionControl={false}
    >
      {/* Bottom-left, clear of the floating sidebar. */}
      <AttributionControl position="bottom-left" compact />
      <SatelliteLayer />
      <HillshadeLayer />
      <ContourLayer />
      <TrailsLayer />
      <RouteLayer />
      <PeakLayer />
    </Map>
  )
}
