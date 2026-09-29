// The API stores metres (see PLAN.md, "Storage units"); the panels show
// imperial (FR-010).

const metresPerFoot = 0.3048
const metresPerMile = 1609.344

export function metresToFeet(metres: number): number {
  return metres / metresPerFoot
}

export function metresToMiles(metres: number): number {
  return metres / metresPerMile
}
