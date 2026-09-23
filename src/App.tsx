import { useState } from 'react'
import type { Feature, LineString } from 'geojson'
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre'
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

type LngLat = [number, number]

// Waypoints are what the user clicked; the drawn line is derived from them.
// Today every leg is straight, so the line is just the waypoints. Once legs
// snap to trails via a routing service, only this function changes.
// See docs/route-builder.md.
function buildRouteLine(waypoints: LngLat[]): Feature<LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: waypoints },
  }
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
  const [waypoints, setWaypoints] = useState<LngLat[]>([])

  return (
    <Map
      initialViewState={{
        longitude: -121.71,
        latitude: 46.85,
        zoom: 12,
      }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      onClick={(e) => setWaypoints((w) => [...w, [e.lngLat.lng, e.lngLat.lat]])}
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

      <Source id="route" type="geojson" data={buildRouteLine(waypoints)}>
        <Layer {...routeLayerStyle} />
      </Source>

      {waypoints.map(([lng, lat], i) => (
        <Marker key={i} longitude={lng} latitude={lat} color="#e6532c" />
      ))}
    </Map>
  )
}

export default App
