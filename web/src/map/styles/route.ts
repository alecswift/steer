import type { LineLayerSpecification } from 'react-map-gl/maplibre'

export const routeLayerStyle: LineLayerSpecification = {
  id: 'route-line',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#e6532c',
    'line-width': 4,
  },
}
