import { isLoopClosed, type LngLat } from './editor'
import type { LegStatus, RouteLeg } from './legCache'

export type LegProperties = { status: LegStatus }
export type WaypointProperties = { start: boolean }

/**
 * The route being edited as GeoJSON: each leg with its status, then a marker
 * per waypoint, the first marked as the start. A closed loop's last waypoint
 * is the start again, so it gets no marker of its own.
 */
export function editorFeatures(
  waypoints: LngLat[],
  legs: RouteLeg[],
): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point, LegProperties | WaypointProperties> {
  const lines = legs.map((leg) => ({
    type: 'Feature' as const,
    properties: { status: leg.status },
    geometry: { type: 'LineString' as const, coordinates: leg.coordinates },
  }))
  const markers = (isLoopClosed(waypoints) ? waypoints.slice(0, -1) : waypoints).map((point, i) => ({
    type: 'Feature' as const,
    properties: { start: i === 0 },
    geometry: { type: 'Point' as const, coordinates: point },
  }))
  return { type: 'FeatureCollection', features: [...lines, ...markers] }
}
