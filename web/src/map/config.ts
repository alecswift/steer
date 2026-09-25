import type { LngLatBoundsLike } from 'maplibre-gl'

// Snoqualmie Pass, from Web Mountain and Mount Defiance in the west to Guye
// and Kendall in the east, with a little margin around every peak.
// Bounds (not center + zoom) so the same area is framed on any screen size.
export const defaultBounds: LngLatBoundsLike = [
  [-121.61, 47.4],
  [-121.36, 47.48],
]

export const baseStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

// Free, no-API-key elevation data (AWS Open Data).
export const demTileUrl =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
