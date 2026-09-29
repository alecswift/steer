import { describe, expect, it } from 'vitest'
import type { LngLat } from './editor'
import { editorFeatures } from './editorFeatures'

const a: LngLat = [-121.41, 47.42]
const b: LngLat = [-121.4, 47.43]
const c: LngLat = [-121.39, 47.44]

const legs = (points: LngLat[]) =>
  editorFeatures(points)
    .features.filter((f) => f.geometry.type === 'LineString')
    .map((f) => f.geometry.coordinates)
const markers = (points: LngLat[]) =>
  editorFeatures(points)
    .features.filter((f) => f.geometry.type === 'Point')
    .map((f) => ({ at: f.geometry.coordinates, ...f.properties }))

describe('editorFeatures', () => {
  it('draws nothing for an empty route', () => {
    expect(editorFeatures([]).features).toEqual([])
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
})
