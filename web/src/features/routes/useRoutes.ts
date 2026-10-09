import { useCallback, useEffect, useState } from 'react'
import { log } from '@/telemetry'
import { listRoutes, type Route } from './api'

// null while loading; `failed` when the list couldn't be fetched.
export type RoutesResult = { routes: Route[] } | { failed: true } | null

/**
 * Loads the saved routes once, when the app starts. `addRoute` puts a route
 * just saved at the top of the list, newest first as Phoenix lists them,
 * since the save returned it in full.
 */
export function useRoutes(): { routes: RoutesResult; addRoute: (route: Route) => void } {
  const [result, setResult] = useState<RoutesResult>(null)

  useEffect(() => {
    let current = true
    listRoutes().then(
      (routes) => {
        if (current) {
          setResult((previous) => {
            const existing = previous && 'routes' in previous ? previous.routes : []
            const existingIds = new Set(existing.map(({ id }) => id))
            return { routes: [...existing, ...routes.filter(({ id }) => !existingIds.has(id))] }
          })
        }
      },
      (error: unknown) => {
        log.error('Could not load routes', { 'error.source': 'routes.list' }, error)
        if (current) setResult({ failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [])

  const addRoute = useCallback(
    (route: Route) =>
      setResult((current) => ({
        routes: [route, ...(current && 'routes' in current ? current.routes : []).filter(({ id }) => id !== route.id)],
      })),
    [],
  )

  return { routes: result, addRoute }
}
