import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoute, deleteRoute, listRoutes, SaveError, type Route } from './api'
import type { SavePayload } from './savePayload'

const snowLake: Route = {
  type: 'Feature',
  id: '7901cbc1-7c41-451d-aabf-5f461a4f7d8c',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-121.42353, 47.44541, 956.7],
      [-121.44806, 47.46853, 1341.0],
    ],
  },
  properties: {
    name: 'Snow Lake',
    distance_m: 10478.1,
    min_ele_m: 956.7,
    max_ele_m: 1341.0,
    gain_m: 637,
    loss_m: 637,
    waypoints: [
      { lon: -121.42353, lat: 47.44541, geometry_index: 0 },
      { lon: -121.44806, lat: 47.46853, geometry_index: 1 },
    ],
    inserted_at: '2026-09-29T16:11:33Z',
    updated_at: '2026-09-29T16:11:33Z',
  },
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listRoutes', () => {
  it('fetches /api/routes and returns its features', async () => {
    const fetchMock = mockFetch(Response.json({ type: 'FeatureCollection', features: [snowLake] }))
    await expect(listRoutes()).resolves.toEqual([snowLake])
    expect(fetchMock).toHaveBeenCalledWith('/api/routes')
  })

  it('returns an empty list when there are no routes', async () => {
    mockFetch(Response.json({ type: 'FeatureCollection', features: [] }))
    await expect(listRoutes()).resolves.toEqual([])
  })

  it.each([null, {}, { features: null }, { features: {} }])(
    'rejects a successful response without a features array: %j',
    async (collection) => {
      mockFetch(Response.json(collection))
      await expect(listRoutes()).rejects.toThrow('GET /api/routes returned invalid features')
    },
  )

  it('throws when the server responds with an error', async () => {
    mockFetch(new Response('', { status: 500 }))
    await expect(listRoutes()).rejects.toThrow('GET /api/routes failed with status 500')
  })
})

describe('createRoute', () => {
  const payload: SavePayload = {
    name: 'Snow Lake',
    waypoints: snowLake.properties.waypoints.map(({ lon, lat }) => ({ lon, lat })),
    legs: [{ coordinates: snowLake.geometry.coordinates, snapped: true }],
  }

  it('posts the payload as JSON and returns the saved route', async () => {
    const fetchMock = mockFetch(Response.json(snowLake, { status: 201 }))
    await expect(createRoute(payload)).resolves.toEqual(snowLake)
    expect(fetchMock).toHaveBeenCalledWith('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  })

  async function failure(promise: Promise<unknown>) {
    const error = await promise.then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(SaveError)
    return (error as SaveError).reason
  }

  it('fails as network when Phoenix is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(await failure(createRoute(payload))).toBe('network')
  })

  it("fails as network on a proxy's plain-text error", async () => {
    mockFetch(new Response('Bad Gateway', { status: 502, headers: { 'Content-Type': 'text/plain' } }))
    expect(await failure(createRoute(payload))).toBe('network')
  })

  it('fails as invalid when Phoenix refuses the route', async () => {
    mockFetch(Response.json({ errors: { legs: ['must have one leg'] } }, { status: 422 }))
    expect(await failure(createRoute(payload))).toBe('invalid')
  })

  it("fails as server on Phoenix's other errors", async () => {
    mockFetch(Response.json({ errors: { detail: 'DEM down' } }, { status: 502 }))
    expect(await failure(createRoute(payload))).toBe('server')
  })

  it.each([null, {}, { id: 'x', geometry: { type: 'Point' }, properties: {} }])(
    "fails as server on a response that isn't a route: %j",
    async (body) => {
      mockFetch(Response.json(body, { status: 201 }))
      expect(await failure(createRoute(payload))).toBe('server')
    },
  )
})

describe('deleteRoute', () => {
  it('sends DELETE to the route', async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }))
    await expect(deleteRoute(snowLake.id)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(`/api/routes/${snowLake.id}`, { method: 'DELETE' })
  })

  it('treats a route that is already gone as deleted', async () => {
    mockFetch(Response.json({ errors: { detail: 'Not Found' } }, { status: 404 }))
    await expect(deleteRoute(snowLake.id)).resolves.toBeUndefined()
  })

  it('throws when the server responds with an error', async () => {
    mockFetch(new Response('', { status: 500 }))
    await expect(deleteRoute(snowLake.id)).rejects.toThrow(`DELETE /api/routes/${snowLake.id} failed with status 500`)
  })

  it('throws when Phoenix is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(deleteRoute(snowLake.id)).rejects.toThrow('Failed to fetch')
  })
})
