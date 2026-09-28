// Display formatting for peak details, in imperial units (FR-010).

const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// 5781 → { value: "5,781", unit: "ft" }, apart so the panel can set the
// number large and the unit small.
export function formatFeet(feet: number): { value: string; unit: string } {
  return { value: wholeNumber.format(feet), unit: 'ft' }
}

const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// 7 → { value: "7.0", unit: "mi" }, to a tenth of a mile like WTA's own
// lengths.
export function formatMiles(miles: number): { value: string; unit: string } {
  return { value: oneDecimal.format(miles), unit: 'mi' }
}

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
