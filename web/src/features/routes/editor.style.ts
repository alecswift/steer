import type { CircleLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre'
import { mapColors } from '@/styles/tokens'

export const editorSourceId = 'editor'

const legLayout: LineLayerSpecification['layout'] = {
  'line-join': 'round',
  'line-cap': 'round',
}

// A snapped leg follows a trail, so it's solid and as wide as a saved route.
export const editorSnappedLegLayerStyle: LineLayerSpecification = {
  id: 'editor-legs-snapped',
  type: 'line',
  source: editorSourceId,
  filter: ['all', ['has', 'status'], ['==', ['get', 'status'], 'snapped']],
  layout: legLayout,
  paint: {
    'line-color': mapColors.route,
    'line-width': 4,
  },
}

// A leg that isn't following a trail is a dashed straight line. A pending
// one, waiting for its snapped geometry, is faded, so it reads as not
// settled yet; a straight one (a fallback) is at full strength.
export const editorStraightLegLayerStyle: LineLayerSpecification = {
  id: 'editor-legs-straight',
  type: 'line',
  source: editorSourceId,
  filter: ['all', ['has', 'status'], ['!=', ['get', 'status'], 'snapped']],
  layout: legLayout,
  paint: {
    'line-color': mapColors.route,
    'line-width': 3,
    'line-dasharray': [1.5, 1.5],
    'line-opacity': ['case', ['==', ['get', 'status'], 'pending'], 0.55, 1],
  },
}

// A stretch on ways tagged foot=no (mapped as closed to hikers) is drawn
// over its leg in amber, with a thin dark casing so it holds on the light
// base map and reads apart from the red-orange route.
const footNoFilter: LineLayerSpecification['filter'] = ['has', 'footNo']

export const editorFootNoCasingLayerStyle: LineLayerSpecification = {
  id: 'editor-legs-foot-no-casing',
  type: 'line',
  source: editorSourceId,
  filter: footNoFilter,
  layout: legLayout,
  paint: {
    'line-color': mapColors.peak,
    'line-width': 6,
    'line-opacity': 0.55,
  },
}

export const editorFootNoLayerStyle: LineLayerSpecification = {
  id: 'editor-legs-foot-no',
  type: 'line',
  source: editorSourceId,
  filter: footNoFilter,
  layout: legLayout,
  paint: {
    'line-color': mapColors.closedTrail,
    'line-width': 4,
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
