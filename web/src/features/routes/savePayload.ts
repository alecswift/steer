// The body of a route save (`POST /api/routes`, and `PUT` in 9.3), built
// from the editor's waypoints and their legs. Pure functions, no React.

import type { LngLat } from './editor'
import type { RouteLeg } from './legCache'

export type SaveLeg = {
  // `[lon, lat, z]`, or `[lon, lat]` for a leg the editor fell back to when
  // `/api/snap` failed (7.4); Phoenix fills in its Z from the DEM.
  coordinates: GeoJSON.Position[]
  snapped: boolean
}

export type SavePayload = {
  // Left out when blank, so Phoenix generates one.
  name?: string
  waypoints: { lon: number; lat: number }[]
  legs: SaveLeg[]
}

/**
 * The save body for `waypoints` and their legs (one between each pair of
 * consecutive waypoints, as `routeLegs` gives them), or null while the route
 * can't be saved: it has fewer than 2 waypoints, or a leg is still pending.
 * A name is trimmed, and left out when blank.
 */
export function savePayload(waypoints: LngLat[], legs: RouteLeg[], name = ''): SavePayload | null {
  if (waypoints.length < 2 || legs.length !== waypoints.length - 1) return null
  if (legs.some((leg) => leg.status === 'pending')) return null
  const trimmed = name.trim()
  return {
    ...(trimmed && { name: trimmed }),
    waypoints: waypoints.map(([lon, lat]) => ({ lon, lat })),
    legs: legs.map((leg) => ({ coordinates: leg.coordinates, snapped: leg.status === 'snapped' })),
  }
}
