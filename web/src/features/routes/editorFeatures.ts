import { isLoopClosed, type LngLat } from './editor'

export type WaypointProperties = { start: boolean }

/**
 * The route being edited as GeoJSON: one straight leg between each pair of
 * consecutive waypoints, then a marker per waypoint, the first marked as the
 * start. A closed loop's last waypoint is the start again, so it gets no
 * marker of its own.
 */
export function editorFeatures(
  waypoints: LngLat[],
): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point, WaypointProperties | null> {
  const legs = waypoints.slice(1).map((to, i) => ({
    type: 'Feature' as const,
    properties: null,
    geometry: { type: 'LineString' as const, coordinates: [waypoints[i], to] },
  }))
  const markers = (isLoopClosed(waypoints) ? waypoints.slice(0, -1) : waypoints).map((point, i) => ({
    type: 'Feature' as const,
    properties: { start: i === 0 },
    geometry: { type: 'Point' as const, coordinates: point },
  }))
  return { type: 'FeatureCollection', features: [...legs, ...markers] }
}
