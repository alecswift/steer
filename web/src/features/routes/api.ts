// The Phoenix routes API (`/api/routes`). Routes arrive as GeoJSON Features
// that MapLibre can draw as they are, with metric stats (converted to
// imperial only for display, FR-010).

import type { SavePayload } from './savePayload'

export type Waypoint = {
  lon: number
  lat: number
  // The vertex in the route's geometry where this waypoint lands.
  geometry_index: number
}

export type RouteProperties = {
  name: string
  distance_m: number
  min_ele_m: number
  max_ele_m: number
  gain_m: number
  loss_m: number
  waypoints: Waypoint[]
  inserted_at: string
  updated_at: string
}

// Positions are `[lon, lat, z]`, with z in metres.
export type Route = GeoJSON.Feature<GeoJSON.LineString, RouteProperties> & { id: string }

/** Fetches the saved routes, newest first. Throws when the request fails. */
export async function listRoutes(): Promise<Route[]> {
  const response = await fetch('/api/routes')
  if (!response.ok) throw new Error(`GET /api/routes failed with status ${response.status}`)
  const collection = (await response.json()) as { features?: unknown } | null
  if (!Array.isArray(collection?.features)) {
    throw new Error('GET /api/routes returned invalid features')
  }
  return collection.features as Route[]
}

// Why a save failed: `network` when Phoenix wasn't reached (a fetch error, or
// a proxy's non-JSON error response), `invalid` when it refused the route
// (422), and `server` for any other error or a response that isn't a route.
export type SaveFailure = 'network' | 'invalid' | 'server'

export class SaveError extends Error {
  readonly reason: SaveFailure

  constructor(reason: SaveFailure, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SaveError'
    this.reason = reason
  }
}

/**
 * Saves a new route (`POST /api/routes`) and returns it as Phoenix stored it,
 * with its stats and its name, generated when none was given. Throws a
 * `SaveError` when the request fails or the response isn't a route.
 */
export async function createRoute(payload: SavePayload): Promise<Route> {
  let response: Response
  try {
    response = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new SaveError('network', `POST /api/routes failed: ${String(error)}`, { cause: error })
  }
  if (!response.ok) {
    // As in snapLeg: Phoenix's errors are JSON, a proxy's are not.
    const fromPhoenix = response.headers.get('Content-Type')?.includes('application/json') ?? false
    const reason = !fromPhoenix ? 'network' : response.status === 422 ? 'invalid' : 'server'
    throw new SaveError(reason, `POST /api/routes failed with status ${response.status}`)
  }
  let route: Partial<Route> | null
  try {
    route = (await response.json()) as Partial<Route> | null
  } catch (error) {
    throw new SaveError('server', 'POST /api/routes returned an invalid route', { cause: error })
  }
  if (typeof route?.id !== 'string' || route.geometry?.type !== 'LineString' || !route.properties) {
    throw new SaveError('server', 'POST /api/routes returned an invalid route')
  }
  return route as Route
}
