import { afterEach, describe, expect, it, vi } from 'vitest'
import { listRoutes, type Route } from './api'

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
