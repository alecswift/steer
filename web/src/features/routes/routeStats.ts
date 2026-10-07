// Live stats for the route being edited, from its legs' geometry. Phoenix
// computes the saved route's stats (Steer.Routes.Stats); this mirrors it, so
// gain and loss match the saved route exactly and distance to within about
// 0.5% (a sphere here, the ellipsoid in PostGIS). Pure functions, no React.

import type { RouteLeg } from './legCache'

export type RouteStats = {
  distanceM: number
  gainM: number
  lossM: number
}

// A climb or descent counts only once it goes this far past the last
// turning point, as in Steer.Routes.Stats.
const thresholdM = 5

// The mean Earth radius (IUGG), in metres.
const earthRadiusM = 6_371_008.8

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** The great-circle distance in metres between two `[lon, lat, ...]` positions. */
export function haversineM(a: GeoJSON.Position, b: GeoJSON.Position): number {
  const dLat = radians(b[1] - a[1])
  const dLon = radians(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)))
}

const samePosition = (a: GeoJSON.Position, b: GeoJSON.Position) =>
  a.length === b.length && a.every((value, i) => value === b[i])

/**
 * Joins the legs into one line, as Phoenix does on save: a leg's first vertex
 * is dropped when it repeats the last leg's end.
 */
export function joinLegs(legs: GeoJSON.Position[][]): GeoJSON.Position[] {
  const line: GeoJSON.Position[] = []
  for (const leg of legs) {
    const repeats = line.length > 0 && leg.length > 0 && samePosition(line[line.length - 1], leg[0])
    line.push(...(repeats ? leg.slice(1) : leg))
  }
  return line
}

/**
 * Total climb and descent along `elevations`, ignoring wobbles of up to 5 m.
 * A climb or descent counts once it goes more than 5 m past the last turning
 * point, and then counts in full.
 */
export function gainAndLoss(elevations: number[]): { gainM: number; lossM: number } {
  if (elevations.length === 0) return { gainM: 0, lossM: 0 }
  let direction: 'unknown' | 'up' | 'down' = 'unknown'
  // Until the first move past the threshold, the lowest and highest so far.
  let low = elevations[0]
  let high = elevations[0]
  // The last turning point, and the furthest point reached since.
  let from = elevations[0]
  let to = elevations[0]
  let gainM = 0
  let lossM = 0

  const commit = () => {
    if (direction === 'up') gainM += to - from
    else if (direction === 'down') lossM += from - to
  }
  const turn = (next: 'up' | 'down', z: number) => {
    commit()
    direction = next
    from = to
    to = z
  }

  for (const z of elevations.slice(1)) {
    if (direction === 'unknown') {
      low = Math.min(low, z)
      high = Math.max(high, z)
      if (z - low > thresholdM) [direction, from, to] = ['up', low, z]
      else if (high - z > thresholdM) [direction, from, to] = ['down', high, z]
    } else if (direction === 'up') {
      if (z >= to) to = z
      else if (to - z > thresholdM) turn('down', z)
    } else {
      if (z <= to) to = z
      else if (z - to > thresholdM) turn('up', z)
    }
  }
  commit()
  return { gainM, lossM }
}

/**
 * The route's distance, gain and loss, or null until every leg has its
 * geometry with elevation: while a leg is pending, or when one fell back to
 * a straight line in the browser (it has no elevation). Null for no legs.
 */
export function routeStats(legs: RouteLeg[]): RouteStats | null {
  if (legs.length === 0) return null
  if (legs.some((leg) => leg.status === 'pending' || leg.coordinates.some((position) => position.length < 3))) {
    return null
  }
  const line = joinLegs(legs.map((leg) => leg.coordinates))
  let distanceM = 0
  for (let i = 1; i < line.length; i++) distanceM += haversineM(line[i - 1], line[i])
  return { distanceM, ...gainAndLoss(line.map((position) => position[2])) }
}
