import type { MapGeoJSONFeature } from 'maplibre-gl'

// A peak from the base map's "mountain_peak" tile layer. Tiles give the
// elevation in metres, and some named points have none.
export type Peak = {
  name: string
  elevationM: number | null
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
    elevationM: typeof properties.ele === 'number' ? properties.ele : null,
    lon,
    lat,
  }
}
