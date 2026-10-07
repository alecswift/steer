import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LngLat } from './editor'
import { SnapError, snapLeg } from './snap'

const from: LngLat = [-121.4133, 47.42769]
const to: LngLat = [-121.45167, 47.45762]

const leg = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-121.4133, 47.42769, 921.5],
      [-121.4301, 47.4402, 1203.25],
      [-121.45167, 47.45762, 1350.0],
    ],
  },
  properties: { snapped: true },
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('snapLeg', () => {
  it('posts the two points to /api/snap and returns the leg', async () => {
    const fetchMock = mockFetch(Response.json(leg))
    await expect(snapLeg(from, to)).resolves.toEqual({
      coordinates: leg.geometry.coordinates,
      snapped: true,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
      signal: undefined,
    })
  })

  it('returns a straight leg Phoenix fell back to', async () => {
    mockFetch(Response.json({ ...leg, properties: { snapped: false } }))
    await expect(snapLeg(from, to)).resolves.toMatchObject({ snapped: false })
  })

  it('passes the signal to fetch', async () => {
    const fetchMock = mockFetch(Response.json(leg))
    const controller = new AbortController()
    await snapLeg(from, to, controller.signal)
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('rejects with an AbortError when the request is aborted', async () => {
    // Behaves like fetch: rejects with the signal's reason once it aborts.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason))),
      ),
    )
    const controller = new AbortController()
    const request = snapLeg(from, to, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it.each([
    null,
    {},
    { ...leg, geometry: { type: 'LineString' } },
    { ...leg, geometry: { type: 'LineString', coordinates: [[-121.4133, 47.42769, 921.5]] } },
    { ...leg, properties: {} },
    { ...leg, properties: { snapped: 'true' } },
  ])('rejects a successful response that isn\'t a leg: %j', async (body) => {
    mockFetch(Response.json(body))
    const request = snapLeg(from, to)
    await expect(request).rejects.toThrow('POST /api/snap returned an invalid leg')
    await expect(request).rejects.toMatchObject({ reason: 'server' })
  })

  it('rejects a successful response that isn\'t JSON as a server failure', async () => {
    mockFetch(new Response('<html>', { status: 200 }))
    await expect(snapLeg(from, to)).rejects.toMatchObject({ name: 'SnapError', reason: 'server' })
  })

  it.each([400, 422, 502])('throws a server failure when Phoenix responds with %i', async (status) => {
    mockFetch(Response.json({ errors: { detail: 'nope' } }, { status }))
    const request = snapLeg(from, to)
    await expect(request).rejects.toThrow(`POST /api/snap failed with status ${status}`)
    await expect(request).rejects.toBeInstanceOf(SnapError)
    await expect(request).rejects.toMatchObject({ reason: 'server' })
  })

  it('throws a network failure when a proxy answers because Phoenix is down', async () => {
    // The Vite dev server's proxy answers this way when Phoenix isn't running.
    mockFetch(new Response(null, { status: 502, headers: { 'Content-Type': 'text/plain' } }))
    await expect(snapLeg(from, to)).rejects.toMatchObject({ name: 'SnapError', reason: 'network' })
  })

  it('throws a network failure when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const request = snapLeg(from, to)
    await expect(request).rejects.toThrow('Failed to fetch')
    await expect(request).rejects.toMatchObject({ name: 'SnapError', reason: 'network' })
  })
})
