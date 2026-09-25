import type {
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import { mapColors } from '../../../styles/tokens'

export const contourLineLayerStyle: LineLayerSpecification = {
  id: 'contour-lines',
  type: 'line',
  source: 'contours',
  'source-layer': 'contours',
  paint: {
    'line-color': mapColors.contourLine,
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
    'text-color': mapColors.contourLabel,
    'text-halo-color': mapColors.contourLabelHalo,
    'text-halo-width': 1,
  },
}
