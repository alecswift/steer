import { Layer } from 'react-map-gl/maplibre'
import { trailLayerStyle } from './trails.style'

// No <Source> of its own: restyles the base style's "openmaptiles" source.
export function TrailsLayer() {
  return <Layer {...trailLayerStyle} />
}
