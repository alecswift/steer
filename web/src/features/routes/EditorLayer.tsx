import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { LngLat } from './editor'
import { editorLegLayerStyle, editorSourceId, editorWaypointLayerStyle } from './editor.style'
import { editorFeatures } from './editorFeatures'

type Props = { waypoints: LngLat[] }

/** Draws the route being edited: its straight legs, with its waypoints on top. */
export function EditorLayer({ waypoints }: Props) {
  const data = useMemo(() => editorFeatures(waypoints), [waypoints])

  return (
    <Source id={editorSourceId} type="geojson" data={data}>
      <Layer {...editorLegLayerStyle} />
      <Layer {...editorWaypointLayerStyle} />
    </Source>
  )
}
