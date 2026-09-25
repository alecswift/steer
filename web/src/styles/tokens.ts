// Map colours for MapLibre layer specs. MapLibre paint properties can't read
// CSS custom properties, so these are the source of truth, and tokens.css
// mirrors them as --map-* variables for UI that sits next to the map (legends,
// swatches). tokens.test.ts fails if the two drift apart.
//
// Map colours don't change between light and dark mode: the base map is
// always light, so these are tuned against it.
export const mapColors = {
  route: '#e6532c',
  trail: '#7b1fa2',
  contourLine: 'rgba(120, 80, 40, 0.6)',
  contourLabel: '#5c3d1f',
  contourLabelHalo: '#fff1bd',
  peak: '#3a2614',
  peakHalo: '#fff1bd',
} as const
