import { useEffect, useEffectEvent } from 'react'
import { Layer, Source, useMap, type PaddingOptions } from 'react-map-gl/maplibre'
import { metrics, track } from '@/telemetry'
import type { Route } from './api'
import { lineBounds } from './bounds'
import { routeLayerStyle, routeSourceId } from './route.style'

// SC-003: selecting a route draws it and fits the map with no visible delay.
const selectToFit = metrics.histogram('steer.route.select_to_fit_ms', {
  description: 'Time from clicking a route until the map shows it and starts framing it',
  advice: {
    explicitBucketBoundaries: [5, 10, 16, 25, 33, 50, 75, 100, 150, 250, 500, 1000],
  },
})

type Props = {
  // The selected route, or null to draw no route.
  route: Route | null
  // When the route was selected, on the performance.now() timeline. A new
  // value frames the route again, even if it's the same route.
  selectedAt: number | null
  // False hides the route without unmounting it, e.g. in edit mode.
  visible: boolean
  // Keeps the framed route clear of the floating sidebar.
  padding: PaddingOptions
  // The map layer to draw the route under.
  beforeId?: string
}

/**
 * Draws only the selected route. Each time a route is selected, fits the map
 * to it and records how long it took until the map first showed the route.
 */
export function RouteLayer({ route, selectedAt, visible, padding, beforeId }: Props) {
  const { current: mapRef } = useMap()

  const onShown = useEffectEvent((ms: number) => {
    selectToFit.record(ms)
    // The event carries the same value, since Loki counts every selection
    // while the histogram can miss the first one after a page load.
    if (route) track('route.shown', { route_id: route.id, select_to_fit_ms: ms })
  })
  const currentPadding = useEffectEvent(() => padding)

  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map || !route || selectedAt === null) return

    map.fitBounds(lineBounds(route.geometry), { padding: currentPadding() })

    // The Source has already been given the new data (it updates during
    // render). The route is on screen at the first frame after the source's
    // worker has finished with it.
    const onRender = () => {
      if (!map.getSource(routeSourceId) || !map.isSourceLoaded(routeSourceId)) return
      map.off('render', onRender)
      onShown(Math.round(performance.now() - selectedAt))
    }
    map.on('render', onRender)
    map.triggerRepaint()
    return () => {
      map.off('render', onRender)
    }
  }, [mapRef, route, selectedAt])

  if (!route) return null

  return (
    <Source id={routeSourceId} type="geojson" data={route}>
      <Layer
        {...routeLayerStyle}
        layout={{ ...routeLayerStyle.layout, visibility: visible ? 'visible' : 'none' }}
        beforeId={beforeId}
      />
    </Source>
  )
}
