import { Layer, Source } from 'react-map-gl/maplibre'
import { routeLayerStyle } from './route.style'

type RouteLayerProps = {
  route?: GeoJSON.Feature<GeoJSON.LineString>
}

// Draws nothing until a route is passed in (selection comes in plan chunk 4.3).
export function RouteLayer({ route }: RouteLayerProps) {
  if (!route) return null

  return (
    <Source id="route" type="geojson" data={route}>
      <Layer {...routeLayerStyle} />
    </Source>
  )
}
