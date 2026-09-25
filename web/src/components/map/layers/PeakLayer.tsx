import { useEffect } from 'react'
import { Layer, useMap } from 'react-map-gl/maplibre'
import { drawPeakMarker } from './peakMarker'
import { peakLayerStyle, peakMarkerImageId } from './peaks.style'

// No <Source> of its own: draws the base style's "openmaptiles" peaks.
export function PeakLayer() {
  const { current: mapRef } = useMap()

  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map) return
    // The marker is added when a tile first asks for it, so it never races
    // the style load.
    map.setMissingStyleImageResolver((id) => {
      if (id !== peakMarkerImageId || map.hasImage(id)) return
      const { image, pixelRatio } = drawPeakMarker()
      map.addImage(id, image, { pixelRatio })
    })
    return () => {
      map.setMissingStyleImageResolver(null)
    }
  }, [mapRef])

  return <Layer {...peakLayerStyle} />
}
