// The Conejo Canyons and Wildwood, in the Conejo Open Space around Thousand
// Oaks, California, centered on Elliott Mountain's trails.
// A center and zoom 13 (not bounds) because OpenFreeMap's tiles have trails
// only from zoom 13, so they show on load; the area shown grows with the
// screen.
export const defaultView = { center: [-118.925, 34.213] as [number, number], zoom: 13 }

// Web Mercator's limit: the map covers latitudes up to about ±85.05°.
export const maxMercatorLat = 85.0511287798

export const baseStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

// Free, no-API-key elevation data (AWS Open Data).
export const demTileUrl =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
