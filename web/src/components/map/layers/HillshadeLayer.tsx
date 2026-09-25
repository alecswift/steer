import { Layer, Source } from 'react-map-gl/maplibre'
import { demSource } from '../../../map/dem'
import { hillshadeLayerStyle } from '../../../map/styles/hillshade'

export function HillshadeLayer() {
  return (
    <Source
      id="terrain-dem"
      type="raster-dem"
      tiles={[demSource.sharedDemProtocolUrl]}
      tileSize={256}
      encoding="terrarium"
    >
      {/* beforeId keeps shading under roads/labels, above land+water fills */}
      <Layer {...hillshadeLayerStyle} beforeId="aeroway_fill" />
    </Source>
  )
}
