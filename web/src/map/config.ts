import type { LngLatBoundsLike } from 'maplibre-gl'

// Placeholder-route area, with enough margin to keep the full line visible.
// Bounds (not center + zoom) so the same area is framed on any screen size.
export const defaultBounds: LngLatBoundsLike = [
  [-121.74, 46.84],
  [-121.69, 46.86],
]

export const baseStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

// Free, no-API-key elevation data (AWS Open Data).
export const demTileUrl =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
