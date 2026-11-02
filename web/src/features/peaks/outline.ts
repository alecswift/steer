import type { MultiPolygon, Position } from 'geojson'

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

/** A point-in-outline test for a MultiPolygon. Each polygon's bounding box is checked before its rings. */
export function outlineCheck(outline: MultiPolygon): (lon: number, lat: number) => boolean {
  const polygons = outline.coordinates.map((rings) => {
    const [outer] = rings
    return {
      rings,
      west: Math.min(...outer.map(([lon]) => lon)),
      east: Math.max(...outer.map(([lon]) => lon)),
      south: Math.min(...outer.map(([, lat]) => lat)),
      north: Math.max(...outer.map(([, lat]) => lat)),
    }
  })
  return (lon, lat) =>
    polygons.some(
      ({ rings: [outer, ...holes], west, east, south, north }) =>
        lon >= west &&
        lon <= east &&
        lat >= south &&
        lat <= north &&
        inRing(lon, lat, outer) &&
        !holes.some((hole) => inRing(lon, lat, hole)),
    )
}
