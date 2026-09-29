import { useState } from 'react'
import Map, { AttributionControl, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { SatelliteLayer } from '@/features/imagery/SatelliteLayer'
import { peakFromFeature, type Peak } from '@/features/peaks/peak'
import { PeakLayer } from '@/features/peaks/PeakLayer'
import { peakLayerId } from '@/features/peaks/peaks.style'
import type { Route } from '@/features/routes/api'
import type { LngLat } from '@/features/routes/editor'
import { EditorLayer } from '@/features/routes/EditorLayer'
import { RouteLayer } from '@/features/routes/RouteLayer'
import { ContourLayer } from '@/features/terrain/ContourLayer'
import { HillshadeLayer } from '@/features/terrain/HillshadeLayer'
import { TrailsLayer } from '@/features/trails/TrailsLayer'
import { baseStyleUrl, defaultBounds } from '@/map/config'
import { metrics, track } from '@/telemetry'
import type { SelectedRoute } from './selection'

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
// In edit mode every click, even on a peak, adds a point, so no layer is
// interactive.
const noInteractiveLayers: string[] = []

// The sidebar floats over the map's right edge, or its bottom on narrow
// screens (see Sidebar.css), so views are framed in the space beside it.
function isNarrow() {
  return window.matchMedia('(max-width: 40rem)').matches
}

// The first view, read once. The sheet is short then: just the route list
// and a prompt.
function defaultViewPadding() {
  return isNarrow() ? { top: 24, right: 24, bottom: 140, left: 24 } : { top: 32, right: 416, bottom: 32, left: 32 }
}

// A selected route is framed above the tallest the sheet can grow, 45vh
// sitting 44px up from the bottom, since its stats make the sheet taller.
function routePadding() {
  if (!isNarrow()) return defaultViewPadding()
  return { top: 24, right: 24, bottom: Math.round(window.innerHeight * 0.45) + 44 + 24, left: 24 }
}

type Props = {
  // The route selected in the sidebar, the only route drawn.
  route: Route | null
  selectedRoute: SelectedRoute | null
  // The route being edited, or null in view mode.
  editWaypoints: LngLat[] | null
  // `at` is the click's DOM timestamp, on the performance.now() timeline.
  onPeakClick: (peak: Peak, at: number) => void
  onEmptyClick: () => void
  onAddPoint: (point: LngLat) => void
}

/**
 * Renders the map layers with the selected route in view mode, or the route
 * being edited in edit mode. In view mode, forwards peak or empty-map clicks
 * to the selection callbacks; in edit mode, every click adds a point.
 */
export function MapView({ route, selectedRoute, editWaypoints, onPeakClick, onEmptyClick, onAddPoint }: Props) {
  const [hovering, setHovering] = useState(false)
  const editing = editWaypoints !== null

  /**
   * Reads the first interactive peak feature and forwards it with the DOM click timestamp.
   * Calls onEmptyClick when the click has no valid peak feature. In edit
   * mode, adds the clicked point instead.
   */
  function handleClick(e: MapLayerMouseEvent) {
    if (editing) {
      onAddPoint([e.lngLat.lng, e.lngLat.lat])
      return
    }
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
      interactiveLayerIds={editing ? noInteractiveLayers : interactiveLayerIds}
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      cursor={editing ? 'crosshair' : hovering ? 'pointer' : undefined}
      // A quick second click adds a point rather than zooming in.
      doubleClickZoom={!editing}
      attributionControl={false}
    >
      {/* Bottom-left, clear of the floating sidebar. */}
      <AttributionControl position="bottom-left" compact />
      <SatelliteLayer />
      <HillshadeLayer />
      <ContourLayer />
      <TrailsLayer />
      {/* Under the peaks, so summits and their names stay readable. Hidden,
          not removed, while editing, so leaving edit mode doesn't frame it
          again. */}
      <RouteLayer
        route={route}
        visible={!editing}
        selectedAt={selectedRoute?.selectedAt ?? null}
        padding={routePadding()}
        beforeId={peakLayerId}
      />
      <PeakLayer />
      {/* Over the peaks, so the points you place are never hidden. */}
      {editing && <EditorLayer waypoints={editWaypoints} />}
    </Map>
  )
}
