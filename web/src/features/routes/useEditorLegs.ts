import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LngLat } from './editor'
import { emptyLegCache, routeLegs, type LegCache, type RouteLeg } from './legCache'
import { LegSnapper } from './legSnapper'

/**
 * The legs of the route being edited, snapped optimistically: a new leg is a
 * straight line until Phoenix's leg arrives. Pass null outside edit mode,
 * which aborts every request and forgets the legs. `loadLegs` starts from a
 * saved route's legs; call it as edit mode opens, in the same update, so the
 * first frame draws them and none is requested.
 */
export function useEditorLegs(waypoints: LngLat[] | null): {
  legs: RouteLeg[]
  loadLegs: (legs: LegCache) => void
} {
  const [cache, setCache] = useState(emptyLegCache)
  const [snapper] = useState(() => new LegSnapper(setCache))

  useEffect(() => {
    if (waypoints) snapper.update(waypoints)
    else snapper.reset()
  }, [snapper, waypoints])

  // Aborts the requests in flight on unmount.
  useEffect(() => () => snapper.reset(), [snapper])

  const loadLegs = useCallback((legs: LegCache) => snapper.load(legs), [snapper])

  // Before the effect has requested a new leg, routeLegs already draws it as
  // a straight line, so it shows on the same frame as its waypoint.
  const legs = useMemo(() => (waypoints ? routeLegs(cache, waypoints) : []), [cache, waypoints])
  return { legs, loadLegs }
}
