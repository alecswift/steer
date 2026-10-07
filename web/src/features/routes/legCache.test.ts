import { describe, expect, it } from 'vitest'
import { editorReducer, initialEditorState, type EditorAction, type LngLat } from './editor'
import {
  dropStaleLegs,
  emptyLegCache,
  failLeg,
  legKey,
  requestLegs,
  resolveLeg,
  routeLegs,
  type LegCache,
} from './legCache'
import type { SnappedLeg } from './snap'

const a: LngLat = [-121.4133, 47.42769]
const b: LngLat = [-121.4301, 47.4402]
const c: LngLat = [-121.45167, 47.45762]

// A snapped leg with one vertex between its ends.
function snapped(from: LngLat, to: LngLat): SnappedLeg {
  const middle = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.001, 1100]
  return { coordinates: [[...from, 1000], middle, [...to, 1200]], snapped: true }
}

// Requests the legs `waypoints` is missing and resolves them all as snapped,
// as the editor does once their responses arrive. Returns the cache and the
// legs that were requested.
function snapAll(cache: LegCache, waypoints: LngLat[]) {
  const { cache: pending, requested } = requestLegs(cache, waypoints)
  const resolved = requested.reduce((next, [from, to]) => resolveLeg(next, from, to, snapped(from, to)), pending)
  return { cache: resolved, requested }
}

describe('legKey', () => {
  it('tells a leg from its reverse', () => {
    expect(legKey(a, b)).not.toBe(legKey(b, a))
  })

  it('is the same for equal points', () => {
    expect(legKey([...a], [...b])).toBe(legKey(a, b))
  })
})

describe('requestLegs', () => {
  it('requests nothing for fewer than 2 waypoints', () => {
    expect(requestLegs(emptyLegCache, [])).toEqual({ cache: emptyLegCache, requested: [] })
    expect(requestLegs(emptyLegCache, [a])).toEqual({ cache: emptyLegCache, requested: [] })
  })

  it('marks each missing leg pending and requests it', () => {
    const { cache, requested } = requestLegs(emptyLegCache, [a, b, c])
    expect(requested).toEqual([
      [a, b],
      [b, c],
    ])
    expect(cache.get(legKey(a, b))).toEqual({ status: 'pending' })
    expect(cache.get(legKey(b, c))).toEqual({ status: 'pending' })
  })

  it('requests only the new leg when a point is added', () => {
    const { cache } = snapAll(emptyLegCache, [a, b])
    expect(requestLegs(cache, [a, b, c]).requested).toEqual([[b, c]])
  })

  it("doesn't request a leg again while it's pending", () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    expect(requestLegs(cache, [a, b, c]).requested).toEqual([[b, c]])
  })

  it('requests a leg that appears twice once', () => {
    expect(requestLegs(emptyLegCache, [a, b, a, b]).requested).toEqual([
      [a, b],
      [b, a],
    ])
  })

  it('returns the same cache when nothing is missing', () => {
    const { cache } = snapAll(emptyLegCache, [a, b])
    expect(requestLegs(cache, [a, b]).cache).toBe(cache)
  })

  it("doesn't change the cache it's given", () => {
    requestLegs(emptyLegCache, [a, b])
    expect(emptyLegCache.size).toBe(0)
  })
})

describe('resolveLeg', () => {
  it('caches a snapped leg', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    const leg = snapped(a, b)
    expect(resolveLeg(cache, a, b, leg).get(legKey(a, b))).toEqual({
      status: 'snapped',
      coordinates: leg.coordinates,
    })
  })

  it('caches a leg Phoenix fell back to as straight', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    const coordinates = [
      [...a, 1000],
      [...b, 1200],
    ]
    expect(resolveLeg(cache, a, b, { coordinates, snapped: false }).get(legKey(a, b))).toEqual({
      status: 'straight',
      coordinates,
    })
  })

  it("doesn't change the cache it's given", () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    resolveLeg(cache, a, b, snapped(a, b))
    expect(cache.get(legKey(a, b))).toEqual({ status: 'pending' })
  })
})

describe('failLeg', () => {
  it('caches a straight line between the two points', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    expect(failLeg(cache, a, b).get(legKey(a, b))).toEqual({ status: 'straight', coordinates: [a, b] })
  })

  it("doesn't request a failed leg again, so the route keeps growing", () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    const { requested } = requestLegs(failLeg(cache, a, b), [a, b, c])
    expect(requested).toEqual([[b, c]])
  })

  it('draws a failed leg as straight, not pending', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    expect(routeLegs(failLeg(cache, a, b), [a, b])).toEqual([{ from: a, to: b, status: 'straight', coordinates: [a, b] }])
  })

  it("doesn't change the cache it's given", () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    failLeg(cache, a, b)
    expect(cache.get(legKey(a, b))).toEqual({ status: 'pending' })
  })
})

describe('dropStaleLegs', () => {
  it('drops pending legs the waypoints no longer use', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b, c])
    const { cache: next, dropped } = dropStaleLegs(cache, [a, b])
    expect(dropped).toEqual([legKey(b, c)])
    expect(next.has(legKey(b, c))).toBe(false)
    expect(next.get(legKey(a, b))).toEqual({ status: 'pending' })
  })

  it('keeps finished legs the waypoints no longer use', () => {
    const { cache } = snapAll(emptyLegCache, [a, b, c])
    expect(dropStaleLegs(cache, [])).toEqual({ cache, dropped: [] })
  })

  it('lets a dropped leg be requested again', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b, c])
    const { cache: next } = dropStaleLegs(cache, [a, b])
    expect(requestLegs(next, [a, b, c]).requested).toEqual([[b, c]])
  })
})

describe('routeLegs', () => {
  it('returns no legs for fewer than 2 waypoints', () => {
    expect(routeLegs(emptyLegCache, [a])).toEqual([])
  })

  it('draws pending and uncached legs as straight lines', () => {
    const { cache } = requestLegs(emptyLegCache, [a, b])
    expect(routeLegs(cache, [a, b, c])).toEqual([
      { from: a, to: b, status: 'pending', coordinates: [a, b] },
      { from: b, to: c, status: 'pending', coordinates: [b, c] },
    ])
  })

  it('returns finished legs with their cached geometry, in order', () => {
    const { cache } = snapAll(emptyLegCache, [a, b, c])
    expect(routeLegs(cache, [a, b, c])).toEqual([
      { from: a, to: b, status: 'snapped', coordinates: snapped(a, b).coordinates },
      { from: b, to: c, status: 'snapped', coordinates: snapped(b, c).coordinates },
    ])
  })
})

// The editor's history and the leg cache together, as the editor will use
// them: after each action, drop the stale pending legs and request the
// missing ones.
describe('across undo and redo', () => {
  function run(actions: EditorAction[]) {
    let editor = initialEditorState
    let cache = emptyLegCache
    const requests: [LngLat, LngLat][][] = []
    for (const action of actions) {
      editor = editorReducer(editor, action)
      cache = dropStaleLegs(cache, editor.present.waypoints).cache
      const result = snapAll(cache, editor.present.waypoints)
      cache = result.cache
      requests.push(result.requested)
    }
    return { editor, cache, requests }
  }

  const build: EditorAction[] = [
    { type: 'ADD_POINT', point: a },
    { type: 'ADD_POINT', point: b },
    { type: 'ADD_POINT', point: c },
  ]

  it('requests each leg once while building', () => {
    expect(run(build).requests).toEqual([[], [[a, b]], [[b, c]]])
  })

  it("doesn't request legs again on undo and redo", () => {
    const { requests, cache, editor } = run([...build, { type: 'UNDO' }, { type: 'UNDO' }, { type: 'REDO' }, { type: 'REDO' }])
    expect(requests.slice(3)).toEqual([[], [], [], []])
    expect(routeLegs(cache, editor.present.waypoints).map((leg) => leg.status)).toEqual(['snapped', 'snapped'])
  })

  it("doesn't request legs again when undoing a clear", () => {
    const { requests } = run([...build, { type: 'CLEAR' }, { type: 'UNDO' }])
    expect(requests.slice(3)).toEqual([[], []])
  })

  it('requests only the closing leg when closing a loop, and not again after undo and redo', () => {
    const { requests } = run([...build, { type: 'CLOSE_LOOP' }, { type: 'UNDO' }, { type: 'REDO' }])
    expect(requests.slice(3)).toEqual([[[c, a]], [], []])
  })

  it('requests a new leg when a different point follows an undo', () => {
    const d: LngLat = [-121.46, 47.46]
    const { requests } = run([...build, { type: 'UNDO' }, { type: 'ADD_POINT', point: d }])
    expect(requests.slice(3)).toEqual([[], [[b, d]]])
  })

  it('requests a leg again on redo when its request was dropped by an undo', () => {
    // Undo before the [b, c] response arrives: the pending leg is dropped
    // (and its request aborted), so redo has to ask for it again.
    let { editor, cache } = run(build.slice(0, 2))
    editor = editorReducer(editor, build[2])
    cache = requestLegs(cache, editor.present.waypoints).cache
    editor = editorReducer(editor, { type: 'UNDO' })
    cache = dropStaleLegs(cache, editor.present.waypoints).cache
    editor = editorReducer(editor, { type: 'REDO' })
    expect(requestLegs(cache, editor.present.waypoints).requested).toEqual([[b, c]])
  })
})
