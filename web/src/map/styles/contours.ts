import type {
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'

export const contourLineLayerStyle: LineLayerSpecification = {
  id: 'contour-lines',
  type: 'line',
  source: 'contours',
  'source-layer': 'contours',
  paint: {
    'line-color': 'rgba(120, 80, 40, 0.6)',
    // level 1 = major (index) contour, 0 = minor
    'line-width': ['match', ['get', 'level'], 1, 1.2, 0.5],
  },
}

export const contourLabelLayerStyle: SymbolLayerSpecification = {
  id: 'contour-labels',
  type: 'symbol',
  source: 'contours',
  'source-layer': 'contours',
  filter: ['>', ['get', 'level'], 0],
  layout: {
    'symbol-placement': 'line',
    'text-size': 10,
    'text-field': ['concat', ['number-format', ['get', 'ele'], {}], "'"],
    'text-font': ['Noto Sans Bold'],
  },
  paint: {
    'text-color': '#5c3d1f',
    'text-halo-color': '#fff',
    'text-halo-width': 1,
  },
}
