import { Layer } from 'react-map-gl/maplibre'
import { trailLayerStyle } from '../../../map/styles/trails'

// No <Source> of its own: restyles the base style's "openmaptiles" source.
export function TrailsLayer() {
  return <Layer {...trailLayerStyle} />
}
