import type { CircleLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre'
import { mapColors } from '@/styles/tokens'

export const editorSourceId = 'editor'

// Straight legs are dashed: a leg that isn't following a trail. Snapped legs
// (7.3) will be solid, like a saved route.
export const editorLegLayerStyle: LineLayerSpecification = {
  id: 'editor-legs',
  type: 'line',
  source: editorSourceId,
  filter: ['==', ['geometry-type'], 'LineString'],
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': mapColors.route,
    'line-width': 3,
    'line-dasharray': [1.5, 1.5],
  },
}

// Waypoints are solid route-coloured dots with a white edge. The start is
// the inverse, a white dot in a route-coloured ring, so you can see where a
// loop will close.
export const editorWaypointLayerStyle: CircleLayerSpecification = {
  id: 'editor-waypoints',
  type: 'circle',
  source: editorSourceId,
  filter: ['==', ['geometry-type'], 'Point'],
  paint: {
    'circle-radius': ['case', ['get', 'start'], 6, 5],
    'circle-color': ['case', ['get', 'start'], mapColors.routeHalo, mapColors.route],
    'circle-stroke-color': ['case', ['get', 'start'], mapColors.route, mapColors.routeHalo],
    'circle-stroke-width': ['case', ['get', 'start'], 3, 2],
  },
}
