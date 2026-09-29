import { describe, expect, it } from 'vitest'
import { metresToFeet, metresToMiles } from './units'

describe('metresToFeet', () => {
  it('uses the international foot', () => {
    expect(metresToFeet(0.3048)).toBeCloseTo(1)
    expect(metresToFeet(1341)).toBeCloseTo(4399.6, 1) // Snow Lake's high point
  })
})

describe('metresToMiles', () => {
  it('uses the international mile', () => {
    expect(metresToMiles(1609.344)).toBeCloseTo(1)
    expect(metresToMiles(10478.1)).toBeCloseTo(6.51, 2) // Snow Lake and back
  })
})
