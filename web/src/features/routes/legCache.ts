// Leg geometry for the route being edited, kept outside the undo history
// (editor.ts) in a map keyed by each leg's from and to points. Undo and redo
// only move waypoints, so the legs they bring back are already here and are
// never requested again. Pure functions with no React; each returns a new map
// rather than changing the one it's given.

import type { LngLat } from './editor'
import type { SnappedLeg } from './snap'

export type LegStatus = 'pending' | 'snapped' | 'straight'

export type CachedLeg =
  | { status: 'pending' }
  // `straight` is a leg drawn as a straight line: one Phoenix fell back to,
  // or one the client fell back to when the snap request failed.
  | { status: 'snapped' | 'straight'; coordinates: GeoJSON.Position[] }

export type LegCache = ReadonlyMap<string, CachedLeg>

// A leg of the route with the geometry to draw: the cached geometry, or a
// straight line while it's pending.
export type RouteLeg = {
  from: LngLat
  to: LngLat
  status: LegStatus
  coordinates: GeoJSON.Position[]
}

export const emptyLegCache: LegCache = new Map()

/** The cache key for the leg from `from` to `to`. A leg and its reverse are different legs. */
export function legKey(from: LngLat, to: LngLat): string {
  return `${from[0]},${from[1]};${to[0]},${to[1]}`
}

// The pairs of consecutive waypoints, one per leg.
function legPairs(waypoints: LngLat[]): [LngLat, LngLat][] {
  return waypoints.slice(1).map((to, i) => [waypoints[i], to])
}

/**
 * Marks the legs of `waypoints` that aren't cached yet as pending, and returns
 * them as the legs to request. A leg that appears more than once is requested
 * once.
 */
export function requestLegs(
  cache: LegCache,
  waypoints: LngLat[],
): { cache: LegCache; requested: [LngLat, LngLat][] } {
  const next = new Map(cache)
  const requested: [LngLat, LngLat][] = []
  for (const [from, to] of legPairs(waypoints)) {
    const key = legKey(from, to)
    if (next.has(key)) continue
    next.set(key, { status: 'pending' })
    requested.push([from, to])
  }
  return requested.length > 0 ? { cache: next, requested } : { cache, requested }
}

/** Caches the leg Phoenix returned for `from` to `to`. */
export function resolveLeg(cache: LegCache, from: LngLat, to: LngLat, leg: SnappedLeg): LegCache {
  const next = new Map(cache)
  next.set(legKey(from, to), { status: leg.snapped ? 'snapped' : 'straight', coordinates: leg.coordinates })
  return next
}

/**
 * Caches the leg from `from` to `to` as a straight line, for when the snap
 * request itself failed (FR-004). It stays straight: the leg isn't requested
 * again, so the route keeps growing while Phoenix is unreachable.
 */
export function failLeg(cache: LegCache, from: LngLat, to: LngLat): LegCache {
  const next = new Map(cache)
  next.set(legKey(from, to), { status: 'straight', coordinates: [from, to] })
  return next
}

/**
 * Drops the pending legs that `waypoints` no longer uses (after an undo or a
 * clear), so their requests can be aborted and a redo requests them again.
 * Returns the dropped keys. Finished legs stay cached for undo and redo.
 */
export function dropStaleLegs(cache: LegCache, waypoints: LngLat[]): { cache: LegCache; dropped: string[] } {
  const used = new Set(legPairs(waypoints).map(([from, to]) => legKey(from, to)))
  const dropped = [...cache].filter(([key, leg]) => leg.status === 'pending' && !used.has(key)).map(([key]) => key)
  if (dropped.length === 0) return { cache, dropped }
  const next = new Map(cache)
  for (const key of dropped) next.delete(key)
  return { cache: next, dropped }
}

/**
 * The legs of `waypoints` in order, with their cached geometry. A leg that's
 * pending, or not cached yet, is a straight line.
 */
export function routeLegs(cache: LegCache, waypoints: LngLat[]): RouteLeg[] {
  return legPairs(waypoints).map(([from, to]) => {
    const leg = cache.get(legKey(from, to))
    return leg && leg.status !== 'pending'
      ? { from, to, status: leg.status, coordinates: leg.coordinates }
      : { from, to, status: 'pending', coordinates: [from, to] }
  })
}
