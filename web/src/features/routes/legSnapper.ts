// Runs the snap requests for the route being edited and keeps the leg cache
// (legCache.ts) in step with its waypoints. No React: useEditorLegs.ts wires
// it to the editor.

import { metrics, track } from '@/telemetry'
import type { LngLat } from './editor'
import { dropStaleLegs, emptyLegCache, failLeg, legKey, requestLegs, resolveLeg, type LegCache } from './legCache'
import { SnapError, snapLeg } from './snap'

// SC-001: a leg appears in under 1 s. The same metric as Phoenix's, told
// apart by `service_name`; this one includes the network and the proxy.
const snapDuration = metrics.histogram('steer.snap.duration_ms', {
  description: 'Time from adding a point until its leg arrives, by snapped',
  advice: {
    explicitBucketBoundaries: [50, 100, 250, 500, 750, 1000, 1500, 2500, 5000, 10000],
  },
})

export class LegSnapper {
  private cache: LegCache = emptyLegCache
  // The request in flight for each pending leg, by leg key.
  private readonly requests = new Map<string, AbortController>()
  private readonly onChange: (cache: LegCache) => void
  private readonly snap: typeof snapLeg

  /**
   * `onChange` gets each new cache. `snap` asks for a leg; it's `snapLeg`
   * outside tests.
   */
  constructor(onChange: (cache: LegCache) => void, snap = snapLeg) {
    this.onChange = onChange
    this.snap = snap
  }

  /**
   * Brings the cache in line with `waypoints`: aborts the requests for pending
   * legs they no longer use (after an undo or a clear), and requests the legs
   * that aren't cached yet. Legs already cached are reused.
   */
  update(waypoints: LngLat[]) {
    const { cache: kept, dropped } = dropStaleLegs(this.cache, waypoints)
    for (const key of dropped) this.abort(key)
    const { cache: next, requested } = requestLegs(kept, waypoints)
    this.commit(next)
    for (const [from, to] of requested) void this.request(from, to)
  }

  /** Aborts every request and forgets every leg, e.g. on leaving edit mode. */
  reset() {
    for (const key of [...this.requests.keys()]) this.abort(key)
    this.commit(emptyLegCache)
  }

  private commit(next: LegCache) {
    if (next === this.cache) return
    this.cache = next
    this.onChange(next)
  }

  private abort(key: string) {
    this.requests.get(key)?.abort()
    this.requests.delete(key)
  }

  // Asks for one leg, and caches it when it arrives, or a straight line when
  // the request fails (7.4).
  private async request(from: LngLat, to: LngLat) {
    const key = legKey(from, to)
    const controller = new AbortController()
    this.requests.set(key, controller)
    const started = performance.now()
    try {
      const leg = await this.snap(from, to, controller.signal)
      // Dropped while the response was on its way.
      if (this.requests.get(key) !== controller) return
      this.requests.delete(key)
      this.commit(resolveLeg(this.cache, from, to, leg))
      const durationMs = Math.round(performance.now() - started)
      snapDuration.record(durationMs, { snapped: leg.snapped })
      track('snap.completed', { duration_ms: durationMs, snapped: leg.snapped })
    } catch (error) {
      // Aborted, or dropped while the request was failing: nothing to keep.
      if (this.requests.get(key) !== controller) return
      this.requests.delete(key)
      this.commit(failLeg(this.cache, from, to))
      track('snap.failed', { reason: error instanceof SnapError ? error.reason : 'server' })
    }
  }
}
