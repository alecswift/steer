// A line's bounding box as [[west, south], [east, north]], for fitBounds.
export function lineBounds(line: GeoJSON.LineString): [[number, number], [number, number]] {
  let [west, south] = line.coordinates[0]
  let [east, north] = [west, south]
  for (const [lon, lat] of line.coordinates) {
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
