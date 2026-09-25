import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { baseStyleUrl, defaultBounds } from '../../map/config'
import { ContourLayer } from './layers/ContourLayer'
import { HillshadeLayer } from './layers/HillshadeLayer'
import { RouteLayer } from './layers/RouteLayer'
import { TrailsLayer } from './layers/TrailsLayer'

export function MapView() {
  return (
    <Map
      initialViewState={{ bounds: defaultBounds }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={baseStyleUrl}
    >
      <HillshadeLayer />
      <ContourLayer />
      <TrailsLayer />
      <RouteLayer />
    </Map>
  )
}
