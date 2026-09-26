import type { MapGeoJSONFeature } from 'maplibre-gl'

// A peak from the base map's "mountain_peak" tile layer. Elevation is the
// tiles' `ele_ft`, which is more exact than converting their whole-metre
// `ele`. Some named points have none.
export type Peak = {
  name: string
  elevationFt: number | null
  lon: number
  lat: number
}

// Reads a clicked peak layer feature. Returns null for anything that isn't a
// named point, which the peak layer's filter should already rule out.
export function peakFromFeature(feature: Pick<MapGeoJSONFeature, 'geometry' | 'properties'>): Peak | null {
  const { geometry, properties } = feature
  if (geometry.type !== 'Point' || typeof properties?.name !== 'string') return null
  const [lon, lat] = geometry.coordinates
  return {
    name: properties.name,
    elevationFt: typeof properties.ele_ft === 'number' ? properties.ele_ft : null,
    lon,
    lat,
  }
}
