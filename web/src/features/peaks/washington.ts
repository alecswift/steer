import type { MultiPolygon, Position } from 'geojson'
import outline from './washington.json'

// Washington State's outline: the US Census Bureau's 2024 cartographic
// boundary file (cb_2024_us_state_500k, public domain), simplified with
// mapshaper to a 1 km tolerance, with islands under 20 km² dropped. 1 km keeps
// peaks near the Columbia River and the 49th parallel on the right side; a
// coarser outline drifts several km along the river.
const washington = outline as MultiPolygon

const positions = washington.coordinates.flat(2)
const bounds = {
  west: Math.min(...positions.map(([lon]) => lon)),
  east: Math.max(...positions.map(([lon]) => lon)),
  south: Math.min(...positions.map(([, lat]) => lat)),
  north: Math.max(...positions.map(([, lat]) => lat)),
}

// Even-odd ray casting: a ray east from the point crosses the ring's edges an
// odd number of times when the point is inside.
function inRing(lon: number, lat: number, ring: Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lonI, latI] = ring[i]
    const [lonJ, latJ] = ring[j]
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) inside = !inside
  }
  return inside
}

/** Whether a point is in Washington State, by the bundled outline. Peak links are limited to it. */
export function isInWashington(lon: number, lat: number): boolean {
  if (lon < bounds.west || lon > bounds.east || lat < bounds.south || lat > bounds.north) return false
  return washington.coordinates.some(
    ([outer, ...holes]) => inRing(lon, lat, outer) && !holes.some((hole) => inRing(lon, lat, hole)),
  )
}
