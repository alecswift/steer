import type { LineLayerSpecification } from 'react-map-gl/maplibre'
import { mapColors } from '@/styles/tokens'

export const routeSourceId = 'route'

export const routeLayerStyle: LineLayerSpecification = {
  id: 'route-line',
  type: 'line',
  source: routeSourceId,
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': mapColors.route,
    'line-width': 4,
  },
}
