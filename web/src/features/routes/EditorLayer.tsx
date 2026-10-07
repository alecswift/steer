import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { LngLat } from './editor'
import {
  editorSnappedLegLayerStyle,
  editorSourceId,
  editorStraightLegLayerStyle,
  editorWaypointLayerStyle,
} from './editor.style'
import { editorFeatures } from './editorFeatures'
import type { RouteLeg } from './legCache'

type Props = { waypoints: LngLat[]; legs: RouteLeg[] }

/** Draws the route being edited: its snapped and straight legs, with its waypoints on top. */
export function EditorLayer({ waypoints, legs }: Props) {
  const data = useMemo(() => editorFeatures(waypoints, legs), [waypoints, legs])

  return (
    <Source id={editorSourceId} type="geojson" data={data}>
      <Layer {...editorSnappedLegLayerStyle} />
      <Layer {...editorStraightLegLayerStyle} />
      <Layer {...editorWaypointLayerStyle} />
    </Source>
  )
}
