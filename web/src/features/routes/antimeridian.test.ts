import { describe, expect, it } from 'vitest'
import { unwrapLongitudes } from './antimeridian'

describe('unwrapLongitudes', () => {
  it('leaves a line that stays clear of ±180° as it is', () => {
    const line = [
      [-121.42, 47.44, 956.7],
      [-121.46, 47.43, 1100],
    ]
    expect(unwrapLongitudes(line)).toEqual(line)
  })

  it('runs a line east across 180° on past it, keeping z', () => {
    expect(
      unwrapLongitudes([
        [179.98, -16.81, 10],
        [-179.99, -16.82, 20],
        [-179.97, -16.84, 30],
      ]),
    ).toEqual([
      [179.98, -16.81, 10],
      [180.01, -16.82, 20],
      [180.03, -16.84, 30],
    ])
  })

  it('runs a line west across -180° on past it', () => {
    const [start, end] = unwrapLongitudes([
      [-179.98, 52],
      [179.97, 52],
    ])
    expect(start).toEqual([-179.98, 52])
    expect(end[0]).toBeCloseTo(-180.03, 9)
  })

  it('keeps unwrapping a line that crosses back again', () => {
    const lons = unwrapLongitudes([
      [179.9, 0],
      [-179.9, 0],
      [179.8, 0],
    ]).map(([lon]) => lon)
    expect(lons[1]).toBeCloseTo(180.1, 9)
    expect(lons[2]).toBe(179.8)
  })
})
