import type { RasterLayerSpecification } from 'react-map-gl/maplibre'

export const satelliteLayerStyle: RasterLayerSpecification = {
  id: 'satellite',
  type: 'raster',
  source: 'satellite',
}
