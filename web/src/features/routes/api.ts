// The Phoenix routes API (`/api/routes`). Routes arrive as GeoJSON Features
// that MapLibre can draw as they are, with metric stats (converted to
// imperial only for display, FR-010).

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
