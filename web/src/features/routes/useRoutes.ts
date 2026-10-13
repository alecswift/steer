import { useCallback, useEffect, useState } from 'react'
import { log } from '@/telemetry'
import { listRoutes, type Route } from './api'

// null while loading; `failed` when the list couldn't be fetched.
export type RoutesResult = { routes: Route[] } | { failed: true } | null

/**
 * Loads the saved routes once, when the app starts. `addRoute` puts a route
 * just saved at the top of the list, newest first as Phoenix lists them,
 * since the save returned it in full. `removeRoute` drops a deleted route.
 */
export function useRoutes(): {
  routes: RoutesResult
  addRoute: (route: Route) => void
  removeRoute: (id: string) => void
} {
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

  const removeRoute = useCallback(
    (id: string) =>
      setResult((current) =>
        current && 'routes' in current ? { routes: current.routes.filter((route) => route.id !== id) } : current,
      ),
    [],
  )

  return { routes: result, addRoute, removeRoute }
}
