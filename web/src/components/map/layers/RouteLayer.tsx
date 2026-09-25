import { Layer, Source } from 'react-map-gl/maplibre'
import { routeLayerStyle } from '../../../map/styles/route'

// Placeholder trail until real GPX/GeoJSON import is wired up.
const placeholderRoute: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [
      [-121.7269, 46.8523],
      [-121.7157, 46.8494],
      [-121.7059, 46.8511],
      [-121.6978, 46.8462],
    ],
  },
}

export function RouteLayer() {
  return (
    <Source id="route" type="geojson" data={placeholderRoute}>
      <Layer {...routeLayerStyle} />
    </Source>
  )
}
