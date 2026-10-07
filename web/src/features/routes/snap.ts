// The Phoenix snap API (`POST /api/snap`): one leg between two waypoints,
// snapped to trails and roads, or a straight line when Phoenix can't snap it.

import type { LngLat } from './editor'

export type SnappedLeg = {
  // `[lon, lat, z]`, with z in metres.
  coordinates: GeoJSON.Position[]
  // False for a straight leg Phoenix fell back to (FR-004).
  snapped: boolean
}

// Why a snap request failed: `network` when Phoenix couldn't be reached,
// `server` when it answered with an error or something that isn't a leg.
// Either way the editor keeps the leg as a straight line (7.4).
export type SnapFailure = 'network' | 'server'

export class SnapError extends Error {
  readonly reason: SnapFailure

  constructor(reason: SnapFailure, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SnapError'
    this.reason = reason
  }
}

/**
 * Asks Phoenix for the leg from `from` to `to`. Throws a `SnapError` when the
 * request fails or the response isn't a leg, and rejects with an `AbortError`
 * when `signal` aborts.
 */
export async function snapLeg(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<SnappedLeg> {
  let response: Response
  try {
    response = await fetch('/api/snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new SnapError('network', `POST /api/snap failed: ${String(error)}`, { cause: error })
  }
  if (!response.ok) {
    // Phoenix's errors are JSON. Any other error response came from a proxy
    // in front of it (the Vite dev server answers 502 in plain text when
    // Phoenix is down), so Phoenix was never reached.
    const fromPhoenix = response.headers.get('Content-Type')?.includes('application/json') ?? false
    throw new SnapError(fromPhoenix ? 'server' : 'network', `POST /api/snap failed with status ${response.status}`)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    throw new SnapError('server', 'POST /api/snap returned an invalid leg', { cause: error })
  }
  const feature = body as {
    geometry?: { coordinates?: unknown }
    properties?: { snapped?: unknown }
  } | null
  const coordinates = feature?.geometry?.coordinates
  const snapped = feature?.properties?.snapped
  if (!Array.isArray(coordinates) || coordinates.length < 2 || typeof snapped !== 'boolean') {
    throw new SnapError('server', 'POST /api/snap returned an invalid leg')
  }
  return { coordinates: coordinates as GeoJSON.Position[], snapped }
}
