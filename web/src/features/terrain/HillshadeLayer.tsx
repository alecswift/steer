import { Layer, Source } from 'react-map-gl/maplibre'
import { demSource } from '@/map/dem'
import { hillshadeLayerStyle } from './hillshade.style'

export function HillshadeLayer() {
  return (
    <Source
      id="terrain-dem"
      type="raster-dem"
      tiles={[demSource.sharedDemProtocolUrl]}
      tileSize={256}
      encoding="terrarium"
      maxzoom={13}
    >
      {/* beforeId keeps shading under roads/labels, above land+water fills */}
      <Layer {...hillshadeLayerStyle} beforeId="aeroway_fill" />
    </Source>
  )
}
