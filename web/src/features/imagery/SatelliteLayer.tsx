import { Layer, Source } from 'react-map-gl/maplibre'
import { satelliteLayerStyle } from './satellite.style'

// Free, no-API-key, public-domain aerial imagery (USDA NAIP via The National
// Map). US only.
const satelliteTileUrl =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'

export function SatelliteLayer() {
  return (
    <Source
      id="satellite"
      type="raster"
      tiles={[satelliteTileUrl]}
      tileSize={256}
      maxzoom={16}
      attribution="USDA, USGS The National Map"
    >
      {/* beforeId covers the land+water fills but keeps roads/labels on top */}
      <Layer {...satelliteLayerStyle} beforeId="aeroway_fill" />
    </Source>
  )
}
