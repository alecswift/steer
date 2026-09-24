import Map, { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { baseStyleUrl, defaultBounds } from './map/config'
import { demSource } from './map/dem'
import { hillshadeLayerStyle } from './map/styles/hillshade'
import { contourLabelLayerStyle, contourLineLayerStyle } from './map/styles/contours'
import { trailLayerStyle } from './map/styles/trails'
import { routeLayerStyle } from './map/styles/route'

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

function App() {
  return (
    <Map
      initialViewState={{ bounds: defaultBounds }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={baseStyleUrl}
    >
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

      <Source
        id="contours"
        type="vector"
        tiles={[
          demSource.contourProtocolUrl({
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
          }),
        ]}
        maxzoom={15}
      >
        <Layer {...contourLineLayerStyle} />
        <Layer {...contourLabelLayerStyle} />
      </Source>

      <Layer {...trailLayerStyle} />

      <Source id="route" type="geojson" data={placeholderRoute}>
        <Layer {...routeLayerStyle} />
      </Source>
    </Map>
  )
}

export default App
