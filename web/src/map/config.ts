import type { LngLatBoundsLike } from 'maplibre-gl'

// The Conejo Open Space around Thousand Oaks, California: from Conejo
// Mountain and the Conejo Canyons in the west to Lang Ranch in the east, and
// from Lake Eleanor and the Los Robles Trail in the south to Mount Clef Ridge
// in the north, with a little margin.
// Bounds (not center + zoom) so the same area is framed on any screen size.
export const defaultBounds: LngLatBoundsLike = [
  [-118.99, 34.13],
  [-118.79, 34.25],
]

export const baseStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

// Free, no-API-key elevation data (AWS Open Data).
export const demTileUrl =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
