import type { LineLayerSpecification } from 'react-map-gl/maplibre'

// OSM's own path/pedestrian/track styling is thin, white, and doesn't render
// below zoom 14 — invisible against terrain. This restyles the same
// "transportation" data from the base style's existing vector source.
export const trailLayerStyle: LineLayerSpecification = {
  id: 'trails',
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'transportation',
  filter: ['match', ['get', 'class'], ['path', 'pedestrian', 'track'], true, false],
  minzoom: 9,
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#7b1fa2',
    'line-width': 1.5,
    'line-dasharray': [2, 1],
  },
}
