import { useEffect, useMemo, useRef, useState } from 'react'
import { log, metrics, track } from '@/telemetry'
import { createRoute, SaveError, type Route, type SaveFailure } from './api'
import type { LngLat } from './editor'
import type { RouteLeg } from './legCache'
import { savePayload } from './savePayload'
import { metresToMiles } from './units'

// SC-002: create, name and save a route in under 2 minutes.
const timeToSave = metrics.histogram('steer.editor.time_to_save_s', {
  description: 'Time from opening the editor until the route is saved',
  advice: {
    explicitBucketBoundaries: [10, 20, 30, 45, 60, 90, 120, 180, 300, 600],
  },
})

// `waiting` until every leg has arrived, then `saving` while the request is
// out. `failed` keeps the reason, to say what to do next.
export type SaveStatus =
  | { name: 'idle' }
  | { name: 'waiting' | 'saving'; routeName: string }
  | { name: 'failed'; reason: SaveFailure }

// What the hiker asked for. Whether a requested save is waiting or saving
// follows from the legs.
type Request = { name: 'idle' } | { name: 'requested'; routeName: string } | { name: 'failed'; reason: SaveFailure }

type Options = {
  waypoints: LngLat[]
  legs: RouteLeg[]
  // When the editor opened, on the performance.now() timeline.
  openedAt: number
  onSaved: (route: Route) => void
}

/**
 * Saves the route being edited. `save` waits for any pending legs, then
 * POSTs the route and passes the saved route to `onSaved`. `reset` stops
 * waiting, or clears a failure; a request already out isn't stopped.
 */
export function useRouteSave({ waypoints, legs, openedAt, onSaved }: Options) {
  const [request, setRequest] = useState<Request>({ name: 'idle' })
  // The save body once it's asked for and every leg has arrived. The editor
  // is behind the modal dialog meanwhile, so the waypoints don't change.
  const payload = useMemo(
    () => (request.name === 'requested' ? savePayload(waypoints, legs, request.routeName) : null),
    [request, waypoints, legs],
  )
  // Guards against sending the same save twice.
  const sending = useRef(false)

  useEffect(() => {
    if (!payload || sending.current) return
    sending.current = true
    createRoute(payload).then(
      (route) => {
        sending.current = false
        setRequest({ name: 'idle' })
        const timeToSaveS = Math.round((performance.now() - openedAt) / 100) / 10
        timeToSave.record(timeToSaveS)
        // The event carries the same value, since Loki counts every save.
        track('route.saved', {
          mode: 'new',
          time_to_save_s: timeToSaveS,
          named: payload.name !== undefined,
          distance_mi: Math.round(metresToMiles(route.properties.distance_m) * 100) / 100,
          leg_count: payload.legs.length,
          straight_leg_count: payload.legs.filter((leg) => !leg.snapped).length,
        })
        onSaved(route)
      },
      (error: unknown) => {
        sending.current = false
        const reason = error instanceof SaveError ? error.reason : 'server'
        setRequest({ name: 'failed', reason })
        track('route.save_failed', { reason })
        log.error('Could not save route', { 'error.source': 'routes.save' }, error)
      },
    )
  }, [payload, openedAt, onSaved])

  const status: SaveStatus =
    request.name === 'requested'
      ? { name: payload ? 'saving' : 'waiting', routeName: request.routeName }
      : request
  return {
    status,
    save: (routeName: string) => {
      if (status.name !== 'saving') setRequest({ name: 'requested', routeName })
    },
    reset: () => {
      if (status.name !== 'saving') setRequest({ name: 'idle' })
    },
  }
}
