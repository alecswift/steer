import { unwrapLongitudes } from './antimeridian'

// A line's bounding box as [[west, south], [east, north]], for fitBounds. For
// a line across ±180°, east runs on past 180 (or west past -180), which
// fitBounds frames as the narrow box across the line.
export function lineBounds(line: GeoJSON.LineString): [[number, number], [number, number]] {
  const positions = unwrapLongitudes(line.coordinates)
  let [west, south] = positions[0]
  let [east, north] = [west, south]
  for (const [lon, lat] of positions) {
    west = Math.min(west, lon)
    east = Math.max(east, lon)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [
    [west, south],
    [east, north],
  ]
}
