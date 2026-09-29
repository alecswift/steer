// Display formatting for peak details.

// Four decimals is about 11 m, plenty to find a summit.
// (-121.3899, 47.4381) → "47.4381° N, 121.3899° W"
export function formatCoordinates(lon: number, lat: number): string {
  return `${hemisphere(lat, 'N', 'S')}, ${hemisphere(lon, 'E', 'W')}`
}

function hemisphere(degrees: number, positive: string, negative: string): string {
  const rounded = degrees.toFixed(4)
  // Rounding first keeps a tiny negative like -0.00001 from reading "0.0000° S".
  const isNegative = Number(rounded) < 0
  return `${rounded.replace('-', '')}° ${isNegative ? negative : positive}`
}
