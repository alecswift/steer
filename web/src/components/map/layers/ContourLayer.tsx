import { Layer, Source } from 'react-map-gl/maplibre'
import { demSource } from '../../../map/dem'
import {
  contourLabelLayerStyle,
  contourLineLayerStyle,
} from '../../../map/styles/contours'

const contourTileUrl = demSource.contourProtocolUrl({
  multiplier: 3.28084, // meters -> feet
  thresholds: {
    10: [500, 2000],
    12: [100, 500],
    14: [50, 200],
    15: [20, 100],
  },
  contourLayer: 'contours',
  elevationKey: 'ele',
  levelKey: 'level',
})

export function ContourLayer() {
  return (
    <Source id="contours" type="vector" tiles={[contourTileUrl]} maxzoom={15}>
      <Layer {...contourLineLayerStyle} />
      <Layer {...contourLabelLayerStyle} />
    </Source>
  )
}
