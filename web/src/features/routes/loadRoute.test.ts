import { describe, expect, it } from 'vitest'
import type { Route } from './api'
import type { LngLat } from './editor'
import { legKey, routeLegs } from './legCache'
import { loadRoute } from './loadRoute'
import { savePayload } from './savePayload'

// Clicked points around Snoqualmie Pass.
const a: LngLat = [-121.4133, 47.42769]
const b: LngLat = [-121.4301, 47.4402]
const c: LngLat = [-121.45167, 47.45762]

// A snapped leg starts and ends on the nearest trail, just off the clicks,
// so two legs from one click share their end.
const nearby = ([lon, lat]: LngLat) => [lon + 0.0001, lat - 0.0001, 1000]
const snapped = (from: LngLat, to: LngLat) => [nearby(from), [from[0], to[1], 1100], nearby(to)]
// A straight leg runs exactly from click to click.
const straight = (from: LngLat, to: LngLat) => [
  [...from, 1000],
  [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 1050],
  [...to, 1000],
]

// Joins legs as Steer.Routes.build/1 does: a leg drops its first vertex when
// it repeats the last one's end, and each waypoint gets the index of the
// vertex where it lands.
function join(legs: GeoJSON.Position[][]) {
  const line = [...legs[0]]
  const indexes = [0, legs[0].length - 1]
  for (const leg of legs.slice(1)) {
    const end = line[line.length - 1]
    const rest = leg[0].every((value, i) => value === end[i]) ? leg.slice(1) : leg
    line.push(...rest)
    indexes.push(line.length - 1)
  }
  return { line, indexes }
}

// A route as Phoenix stores it, from clicked points and their legs.
function saved(waypoints: LngLat[], legs: GeoJSON.Position[][]): Route {
  const { line, indexes } = join(legs)
  return {
    type: 'Feature',
    id: 'route',
    geometry: { type: 'LineString', coordinates: line },
    properties: {
      name: 'Test',
      distance_m: 0,
      min_ele_m: 0,
      max_ele_m: 0,
      gain_m: 0,
      loss_m: 0,
      waypoints: waypoints.map(([lon, lat], i) => ({ lon, lat, geometry_index: indexes[i] })),
      inserted_at: '2026-10-19T00:00:00Z',
      updated_at: '2026-10-19T00:00:00Z',
    },
  }
}

describe('loadRoute', () => {
  it('gives back the clicked waypoints', () => {
    expect(loadRoute(saved([a, b, c], [snapped(a, b), snapped(b, c)])).waypoints).toEqual([a, b, c])
  })

  it('splits the line at each waypoint into the legs it was joined from', () => {
    const legs = [snapped(a, b), straight(b, c)]
    const loaded = loadRoute(saved([a, b, c], [snapped(a, b), straight(b, c)]))
    expect(loaded.legs.get(legKey(a, b))).toEqual({ status: 'snapped', coordinates: legs[0] })
    // The straight leg starts at the click, away from the snapped leg's end,
    // so it gets that end too.
    expect(loaded.legs.get(legKey(b, c))).toEqual({ status: 'straight', coordinates: [nearby(b), ...legs[1]] })
  })

  it('splits legs that shared a joint vertex at that vertex', () => {
    const legs = [straight(a, b), straight(b, c)]
    const loaded = loadRoute(saved([a, b, c], legs))
    expect(loaded.legs.get(legKey(a, b))).toEqual({ status: 'straight', coordinates: legs[0] })
    expect(loaded.legs.get(legKey(b, c))).toEqual({ status: 'straight', coordinates: legs[1] })
  })

  it('tells a snapped leg from a straight one by where it ends', () => {
    const loaded = loadRoute(saved([a, b, c], [straight(a, b), snapped(b, c)]))
    expect(routeLegs(loaded.legs, loaded.waypoints).map((leg) => leg.status)).toEqual(['straight', 'snapped'])
  })

  it('splits a closed loop, whose last waypoint is its first', () => {
    const legs = [snapped(a, b), snapped(b, c), snapped(c, a)]
    const loaded = loadRoute(saved([a, b, c, a], legs))
    expect(routeLegs(loaded.legs, loaded.waypoints).map((leg) => leg.coordinates)).toEqual(legs)
  })

  it.each([
    ['snapped legs', [snapped(a, b), snapped(b, c), snapped(c, a)]],
    ['straight legs', [straight(a, b), straight(b, c), straight(c, a)]],
    ['a mix', [snapped(a, b), straight(b, c), snapped(c, a)]],
  ])('joins back into the same line and waypoints when saved again: %s', (_name, legs) => {
    const route = saved([a, b, c, a], legs)
    const loaded = loadRoute(route)
    const payload = savePayload(loaded.waypoints, routeLegs(loaded.legs, loaded.waypoints))!
    const resaved = saved(loaded.waypoints, payload.legs.map((leg) => leg.coordinates))
    expect(resaved.geometry).toEqual(route.geometry)
    expect(resaved.properties.waypoints).toEqual(route.properties.waypoints)
  })
})
