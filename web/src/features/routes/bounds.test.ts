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
