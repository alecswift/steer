// Turns a saved route back into what the editor works with: its waypoints,
// and its legs for the leg cache, so editing it requests nothing again.
// Pure functions, no React.

import type { Route } from './api'
import type { LngLat } from './editor'
import { legKey, type CachedLeg, type LegCache } from './legCache'

export type LoadedRoute = { waypoints: LngLat[]; legs: LegCache }

/**
 * Splits a saved route's geometry at each waypoint's `geometry_index` into
 * one leg per pair of consecutive waypoints, cached by their points.
 *
 * Each leg runs from its start waypoint's vertex to its end waypoint's vertex
 * inclusive. Phoenix joins legs by dropping a repeated joint vertex, so this
 * gives back the legs it was given, except where a leg started away from the
 * last one's end (a straight leg after a snapped one): that leg also gets the
 * last one's end vertex. Saving the legs again joins them into the same line.
 *
 * Whether a leg was snapped isn't stored, so it's told from the geometry:
 * a straight leg, whether Phoenix or the editor fell back to it, ends exactly
 * on the clicked point, and a snapped leg ends on the nearest trail.
 */
export function loadRoute(route: Route): LoadedRoute {
  const { coordinates } = route.geometry
  const stored = route.properties.waypoints
  const waypoints = stored.map(({ lon, lat }): LngLat => [lon, lat])
  const legs = new Map<string, CachedLeg>()
  for (let i = 1; i < stored.length; i++) {
    const leg = coordinates.slice(stored[i - 1].geometry_index, stored[i].geometry_index + 1)
    const [lon, lat] = leg[leg.length - 1]
    const straight = lon === stored[i].lon && lat === stored[i].lat
    legs.set(legKey(waypoints[i - 1], waypoints[i]), { status: straight ? 'straight' : 'snapped', coordinates: leg })
  }
  return { waypoints, legs }
}
