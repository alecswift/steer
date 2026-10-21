import { describe, expect, it } from 'vitest'
import { lineBounds } from './bounds'

describe('lineBounds', () => {
  it('spans every position, ignoring z', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [-121.42353, 47.44541, 956.7],
        [-121.46, 47.43, 1100],
        [-121.44806, 47.46853, 1341],
      ],
    }
    expect(lineBounds(line)).toEqual([
      [-121.46, 47.43],
      [-121.42353, 47.46853],
    ])
  })

  it('spans the short way across 180°, with east past it', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [179.98, -16.81, 10],
        [-179.97, -16.84, 30],
      ],
    }
    const [[west, south], [east, north]] = lineBounds(line)
    expect([west, south, north]).toEqual([179.98, -16.84, -16.81])
    expect(east).toBeCloseTo(180.03, 9)
  })

  it('is a single point for a line that goes out and back to one place', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [-121.4, 47.4, 900],
        [-121.4, 47.4, 900],
      ],
    }
    expect(lineBounds(line)).toEqual([
      [-121.4, 47.4],
      [-121.4, 47.4],
    ])
  })
})
