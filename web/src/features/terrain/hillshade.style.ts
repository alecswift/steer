import type { HillshadeLayerSpecification } from 'react-map-gl/maplibre'

export const hillshadeLayerStyle: HillshadeLayerSpecification = {
  id: 'hillshade',
  type: 'hillshade',
  source: 'terrain-dem',
  paint: {
    // kept subtle so it reads as texture, not the primary information layer
    'hillshade-exaggeration': 0.25,
  },
}
