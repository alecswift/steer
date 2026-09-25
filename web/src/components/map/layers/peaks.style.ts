import type { SymbolLayerSpecification } from 'react-map-gl/maplibre'
import { mapColors } from '../../../styles/tokens'

export const peakLayerId = 'peaks'
export const peakMarkerImageId = 'steer-peak-marker'

// The base style carries peaks in its "mountain_peak" layer but doesn't draw
// them. Volcanoes (Rainier, Baker, Hood) are their own class in the tiles, so
// they're included alongside peaks; saddles are not summits and are left out.
export const peakLayerStyle: SymbolLayerSpecification = {
  id: peakLayerId,
  type: 'symbol',
  source: 'openmaptiles',
  'source-layer': 'mountain_peak',
  filter: ['all', ['match', ['get', 'class'], ['peak', 'volcano'], true, false], ['has', 'name']],
  layout: {
    'icon-image': peakMarkerImageId,
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Bold'],
    'text-size': 12,
    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    'text-radial-offset': 0.7,
    'text-max-width': 8,
    // When labels collide the triangle stays and the name drops.
    'text-optional': true,
    // Tiles rank peaks 1 (most important) upward within each area; lower keys
    // are placed first. Within a rank, the higher peak wins (ele < 10,000 m).
    'symbol-sort-key': ['-', ['*', ['get', 'rank'], 10000], ['coalesce', ['get', 'ele'], 0]],
  },
  paint: {
    'text-color': mapColors.peak,
    'text-halo-color': mapColors.peakHalo,
    'text-halo-width': 1.2,
  },
}
