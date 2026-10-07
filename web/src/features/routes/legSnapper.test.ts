import { beforeEach, describe, expect, it, vi } from 'vitest'
import { editorReducer, initialEditorState, type EditorAction, type EditorState, type LngLat } from './editor'
import { routeLegs, type LegCache } from './legCache'
import { LegSnapper } from './legSnapper'
import { SnapError, type SnappedLeg } from './snap'

const { track, record } = vi.hoisted(() => ({ track: vi.fn(), record: vi.fn() }))
vi.mock('@/telemetry', () => ({ track, metrics: { histogram: () => ({ record }) } }))

const a: LngLat = [-121.4133, 47.42769]
const b: LngLat = [-121.4301, 47.4402]
const c: LngLat = [-121.45167, 47.45762]

function snapped(from: LngLat, to: LngLat): SnappedLeg {
  return { coordinates: [[...from, 1000], [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 1100], [...to, 1200]], snapped: true }
}

// A snap request the test answers by hand.
type Request = {
  from: LngLat
  to: LngLat
  signal: AbortSignal
  resolve: (leg: SnappedLeg) => void
  reject: (error: unknown) => void
}

// A snapper with a fake `snap` that records each request, and the editor
// state it follows. With `honorAbort` false, the fake ignores its signal, as
// when a response is already in by the time it aborts.
function setup({ honorAbort = true } = {}) {
  const requests: Request[] = []
  const snap = vi.fn(
    (from: LngLat, to: LngLat, signal?: AbortSignal) =>
      new Promise<SnappedLeg>((resolve, reject) => {
        requests.push({ from, to, signal: signal!, resolve, reject })
        // Like fetch, rejects with an AbortError once the signal aborts.
        if (honorAbort) signal?.addEventListener('abort', () => reject(signal.reason))
      }),
  )
  let cache: LegCache = new Map()
  const snapper = new LegSnapper((next) => (cache = next), snap)
  let editor: EditorState = initialEditorState

  return {
    requests,
    snap,
    snapper,
    get waypoints() {
      return editor.present.waypoints
    },
    // Applies an editor action and updates the snapper, as the hook does.
    edit(...actions: EditorAction[]) {
      for (const action of actions) {
        editor = editorReducer(editor, action)
        snapper.update(editor.present.waypoints)
      }
    },
    legs() {
      return routeLegs(cache, editor.present.waypoints).map((leg) => leg.status)
    },
  }
}

const add = (point: LngLat): EditorAction => ({ type: 'ADD_POINT', point })

// Lets the snapper's awaits run.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  track.mockClear()
  record.mockClear()
})

describe('LegSnapper', () => {
  it('requests each new leg and draws it straight until it arrives', () => {
    const t = setup()
    t.edit(add(a), add(b))
    expect(t.requests.map((r) => [r.from, r.to])).toEqual([[a, b]])
    expect(t.legs()).toEqual(['pending'])
  })

  it('swaps in the snapped leg when it arrives', async () => {
    const t = setup()
    t.edit(add(a), add(b))
    t.requests[0].resolve(snapped(a, b))
    await settle()
    expect(t.legs()).toEqual(['snapped'])
    expect(record).toHaveBeenCalledWith(expect.any(Number), { snapped: true })
    expect(track).toHaveBeenCalledWith('snap.completed', { duration_ms: expect.any(Number), snapped: true })
  })

  it('keeps a leg Phoenix fell back to as straight', async () => {
    const t = setup()
    t.edit(add(a), add(b))
    t.requests[0].resolve({ ...snapped(a, b), snapped: false })
    await settle()
    expect(t.legs()).toEqual(['straight'])
    expect(record).toHaveBeenCalledWith(expect.any(Number), { snapped: false })
  })

  it('requests the closing leg of a loop', () => {
    const t = setup()
    t.edit(add(a), add(b), add(c), { type: 'CLOSE_LOOP' })
    expect(t.requests.map((r) => [r.from, r.to])).toEqual([
      [a, b],
      [b, c],
      [c, a],
    ])
  })

  it('aborts a pending leg on undo and requests it again on redo', async () => {
    const t = setup()
    t.edit(add(a), add(b), { type: 'UNDO' })
    expect(t.requests[0].signal.aborted).toBe(true)
    t.edit({ type: 'REDO' })
    expect(t.requests).toHaveLength(2)
    // The aborted request settles without touching the new one.
    await settle()
    expect(t.legs()).toEqual(['pending'])
    t.requests[1].resolve(snapped(a, b))
    await settle()
    expect(t.legs()).toEqual(['snapped'])
    expect(track).not.toHaveBeenCalledWith('snap.failed', expect.anything())
  })

  it('aborts every pending leg on clear', () => {
    const t = setup()
    t.edit(add(a), add(b), add(c), { type: 'CLEAR' })
    expect(t.requests.map((r) => r.signal.aborted)).toEqual([true, true])
  })

  it("doesn't request a finished leg again on undo and redo", async () => {
    const t = setup()
    t.edit(add(a), add(b))
    t.requests[0].resolve(snapped(a, b))
    await settle()
    t.edit({ type: 'UNDO' }, { type: 'REDO' }, { type: 'CLEAR' }, { type: 'UNDO' })
    expect(t.snap).toHaveBeenCalledTimes(1)
    expect(t.legs()).toEqual(['snapped'])
  })

  it('ignores a response that arrives after its leg was dropped', async () => {
    const t = setup({ honorAbort: false })
    t.edit(add(a), add(b), add(c), { type: 'UNDO' })
    t.requests[1].resolve(snapped(b, c))
    await settle()
    t.edit({ type: 'REDO' })
    // Requested again, not taken from the dropped request.
    expect(t.requests).toHaveLength(3)
    expect(t.legs()).toEqual(['pending', 'pending'])
    expect(track).not.toHaveBeenCalled()
  })

  it('ignores a failure that arrives after its leg was dropped', async () => {
    const t = setup({ honorAbort: false })
    t.edit(add(a), add(b), { type: 'UNDO' })
    t.requests[0].reject(new SnapError('network', 'Failed to fetch'))
    await settle()
    t.edit({ type: 'REDO' })
    expect(t.legs()).toEqual(['pending'])
    expect(track).not.toHaveBeenCalled()
  })

  describe('when the request fails (7.4)', () => {
    it.each(['network', 'server'] as const)('keeps the leg straight after a %s failure', async (reason) => {
      const t = setup()
      t.edit(add(a), add(b))
      t.requests[0].reject(new SnapError(reason, 'POST /api/snap failed'))
      await settle()
      expect(t.legs()).toEqual(['straight'])
      expect(track).toHaveBeenCalledWith('snap.failed', { reason })
      expect(record).not.toHaveBeenCalled()
    })

    it('counts an unexpected error as a server failure', async () => {
      const t = setup()
      t.edit(add(a), add(b))
      t.requests[0].reject(new Error('boom'))
      await settle()
      expect(track).toHaveBeenCalledWith('snap.failed', { reason: 'server' })
    })

    it('keeps growing the route with straight legs', async () => {
      const t = setup()
      t.edit(add(a), add(b), add(c))
      for (const request of t.requests) request.reject(new SnapError('network', 'Failed to fetch'))
      await settle()
      expect(t.waypoints).toEqual([a, b, c])
      expect(t.legs()).toEqual(['straight', 'straight'])
      // A failed leg isn't requested again on undo and redo.
      t.edit({ type: 'UNDO' }, { type: 'REDO' })
      expect(t.snap).toHaveBeenCalledTimes(2)
    })
  })

  it('aborts every request and forgets every leg on reset', async () => {
    const t = setup()
    t.edit(add(a), add(b), add(c))
    t.requests[0].resolve(snapped(a, b))
    await settle()
    t.snapper.reset()
    expect(t.requests[1].signal.aborted).toBe(true)
    expect(t.legs()).toEqual(['pending', 'pending'])
    // The same waypoints again (e.g. StrictMode remounting) request both legs.
    t.snapper.update(t.waypoints)
    expect(t.snap).toHaveBeenCalledTimes(4)
  })
})
