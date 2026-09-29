import { useEffect, useState } from 'react'
import { log } from '@/telemetry'
import { listRoutes, type Route } from './api'

// null while loading; `failed` when the list couldn't be fetched.
export type RoutesResult = { routes: Route[] } | { failed: true } | null

/** Loads the saved routes once, when the app starts. */
export function useRoutes(): RoutesResult {
  const [result, setResult] = useState<RoutesResult>(null)

  useEffect(() => {
    let current = true
    listRoutes().then(
      (routes) => {
        if (current) setResult({ routes })
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

  return result
}
