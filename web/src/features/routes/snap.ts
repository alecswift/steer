// The Phoenix snap API (`POST /api/snap`): one leg between two waypoints,
// snapped to trails and roads, or a straight line when Phoenix can't snap it.

import type { LngLat } from './editor'

export type SnappedLeg = {
  // `[lon, lat, z]`, with z in metres.
  coordinates: GeoJSON.Position[]
  // False for a straight leg Phoenix fell back to (FR-004).
  snapped: boolean
}

/**
 * Asks Phoenix for the leg from `from` to `to`. Throws when the request fails
 * or the response isn't a leg, and rejects with an `AbortError` when `signal`
 * aborts.
 */
export async function snapLeg(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<SnappedLeg> {
  const response = await fetch('/api/snap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
    signal,
  })
  if (!response.ok) throw new Error(`POST /api/snap failed with status ${response.status}`)
  const feature = (await response.json()) as {
    geometry?: { coordinates?: unknown }
    properties?: { snapped?: unknown }
  } | null
  const coordinates = feature?.geometry?.coordinates
  const snapped = feature?.properties?.snapped
  if (!Array.isArray(coordinates) || coordinates.length < 2 || typeof snapped !== 'boolean') {
    throw new Error('POST /api/snap returned an invalid leg')
  }
  return { coordinates: coordinates as GeoJSON.Position[], snapped }
}
