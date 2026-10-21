/**
 * The positions with each longitude moved by whole turns to within 180° of
 * the one before, so a line across ±180° runs on past it (179.9 to 180.1)
 * rather than back across the world (179.9 to -179.9). MapLibre draws a line
 * past ±180° on both sides of it. Routes are stored and sent within
 * -180..180; this is only for drawing and framing them.
 */
export function unwrapLongitudes(positions: GeoJSON.Position[]): GeoJSON.Position[] {
  let previous: number | null = null
  return positions.map(([lon, ...rest]) => {
    if (previous !== null) lon += Math.round((previous - lon) / 360) * 360
    previous = lon
    return [lon, ...rest]
  })
}
