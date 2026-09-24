import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type {
  HillshadeLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import * as maplibregl from 'maplibre-gl'
import mlcontour from 'maplibre-contour'
import 'maplibre-gl/dist/maplibre-gl.css'

// Free, no-API-key elevation data (AWS Open Data). Powers both the hillshade
// texture and the contour lines below, sharing one tile cache between them.
// Also reusable later for computing route elevation gain/loss.
const demSource = new mlcontour.DemSource({
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  maxzoom: 13,
  worker: true,
})
demSource.setupMaplibre(maplibregl)

const hillshadeLayerStyle: HillshadeLayerSpecification = {
  id: 'hillshade',
  type: 'hillshade',
  source: 'terrain-dem',
  paint: {
    // kept subtle so it reads as texture, not the primary information layer
    'hillshade-exaggeration': 0.25,
  },
}

const contourLineLayerStyle: LineLayerSpecification = {
  id: 'contour-lines',
  type: 'line',
  source: 'contours',
  'source-layer': 'contours',
  paint: {
    'line-color': 'rgba(120, 80, 40, 0.6)',
    // level 1 = major (index) contour, 0 = minor
    'line-width': ['match', ['get', 'level'], 1, 1.2, 0.5],
  },
}

const contourLabelLayerStyle: SymbolLayerSpecification = {
  id: 'contour-labels',
  type: 'symbol',
  source: 'contours',
  'source-layer': 'contours',
  filter: ['>', ['get', 'level'], 0],
  layout: {
    'symbol-placement': 'line',
    'text-size': 10,
    'text-field': ['concat', ['number-format', ['get', 'ele'], {}], "'"],
    'text-font': ['Noto Sans Bold'],
  },
  paint: {
    'text-color': '#5c3d1f',
    'text-halo-color': '#fff',
    'text-halo-width': 1,
  },
}

// OSM's own path/pedestrian/track styling is thin, white, and doesn't render
// below zoom 14 — invisible against terrain. This restyles the same
// "transportation" data from the base style's existing vector source.
const trailLayerStyle: LineLayerSpecification = {
  id: 'trails',
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'transportation',
  filter: ['match', ['get', 'class'], ['path', 'pedestrian', 'track'], true, false],
  minzoom: 9,
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#7b1fa2',
    'line-width': 1.5,
    'line-dasharray': [2, 1],
  },
}

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

const routeLayerStyle: LineLayerSpecification = {
  id: 'route-line',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#e6532c',
    'line-width': 4,
  },
}

function App() {
  return (
    <Map
      initialViewState={{
        longitude: -121.71,
        latitude: 46.85,
        zoom: 12,
      }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
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
