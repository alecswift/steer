import { describe, expect, it } from 'vitest'
import type { LngLat } from './editor'
import { editorFeatures } from './editorFeatures'
import { emptyLegCache, requestLegs, resolveLeg, routeLegs } from './legCache'

const a: LngLat = [-121.41, 47.42]
const b: LngLat = [-121.4, 47.43]
const c: LngLat = [-121.39, 47.44]

// The features for `points` with every leg still pending, as when it's just
// been drawn.
const features = (points: LngLat[]) => editorFeatures(points, routeLegs(emptyLegCache, points))
const legs = (points: LngLat[]) =>
  features(points)
    .features.filter((f) => f.geometry.type === 'LineString')
    .map((f) => f.geometry.coordinates)
const markers = (points: LngLat[]) =>
  features(points)
    .features.filter((f) => f.geometry.type === 'Point')
    .map((f) => ({ at: f.geometry.coordinates, ...f.properties }))

describe('editorFeatures', () => {
  it('draws nothing for an empty route', () => {
    expect(features([]).features).toEqual([])
  })

  it('draws a single point as the start, with no legs', () => {
    expect(legs([a])).toEqual([])
    expect(markers([a])).toEqual([{ at: a, start: true }])
  })

  it('draws a straight leg between each pair of consecutive points', () => {
    expect(legs([a, b, c])).toEqual([
      [a, b],
      [b, c],
    ])
  })

  it('marks only the first point as the start', () => {
    expect(markers([a, b, c])).toEqual([
      { at: a, start: true },
      { at: b, start: false },
      { at: c, start: false },
    ])
  })

  it('draws the closing leg of a loop but no second marker on the start', () => {
    expect(legs([a, b, c, a])).toEqual([
      [a, b],
      [b, c],
      [c, a],
    ])
    expect(markers([a, b, c, a])).toHaveLength(3)
  })

  it('draws a pending leg as a straight line with its status', () => {
    const lines = features([a, b]).features.filter((f) => f.geometry.type === 'LineString')
    expect(lines).toEqual([
      { type: 'Feature', properties: { status: 'pending' }, geometry: { type: 'LineString', coordinates: [a, b] } },
    ])
  })

  it('draws a finished leg with its geometry and status', () => {
    const coordinates = [[...a, 1000], [-121.405, 47.426, 1100], [...b, 1200]]
    const { cache } = requestLegs(emptyLegCache, [a, b, c])
    const resolved = resolveLeg(cache, a, b, { coordinates, snapped: true })
    const lines = editorFeatures([a, b, c], routeLegs(resolved, [a, b, c])).features.filter(
      (f) => f.geometry.type === 'LineString',
    )
    expect(lines.map((f) => [f.properties, f.geometry.coordinates])).toEqual([
      [{ status: 'snapped' }, coordinates],
      [{ status: 'pending' }, [b, c]],
    ])
  })
})
