import * as maplibregl from 'maplibre-gl'
import mlcontour from 'maplibre-contour'
import { demTileUrl } from './config'

// Powers both the hillshade texture and the contour lines, sharing one tile
// cache between them. Also reusable later for computing route elevation
// gain/loss.
export const demSource = new mlcontour.DemSource({
  url: demTileUrl,
  encoding: 'terrarium',
  maxzoom: 13,
  worker: true,
})
demSource.setupMaplibre(maplibregl)
