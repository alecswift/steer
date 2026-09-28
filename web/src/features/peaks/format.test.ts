import { describe, expect, it } from 'vitest'
import { formatCoordinates, formatFeet, formatMiles } from './format'

describe('formatFeet', () => {
  it('adds thousands separators and the unit', () => {
    expect(formatFeet(5781)).toEqual({ value: '5,781', unit: 'ft' }) // Kendall Peak
    expect(formatFeet(14411)).toEqual({ value: '14,411', unit: 'ft' })
  })

  it('shows small and zero values without a separator', () => {
    expect(formatFeet(0)).toEqual({ value: '0', unit: 'ft' })
    expect(formatFeet(328)).toEqual({ value: '328', unit: 'ft' })
  })

  it('rounds to the nearest foot', () => {
    expect(formatFeet(1000.4).value).toBe('1,000')
    expect(formatFeet(1000.6).value).toBe('1,001')
  })

  it('keeps the sign for places below sea level', () => {
    expect(formatFeet(-282).value).toBe('-282')
  })
})

describe('formatMiles', () => {
  it('shows a tenth of a mile, with thousands separators', () => {
    expect(formatMiles(7)).toEqual({ value: '7.0', unit: 'mi' }) // Kendall Peak Lakes
    expect(formatMiles(9.25)).toEqual({ value: '9.3', unit: 'mi' })
    expect(formatMiles(2650)).toEqual({ value: '2,650.0', unit: 'mi' }) // the PCT
  })
})

describe('formatCoordinates', () => {
  it('shows latitude first, to four decimals, with hemisphere letters', () => {
    expect(formatCoordinates(-121.3899, 47.4381)).toBe('47.4381° N, 121.3899° W')
  })

  it('covers every hemisphere', () => {
    expect(formatCoordinates(151.2093, -33.8688)).toBe('33.8688° S, 151.2093° E')
    expect(formatCoordinates(-70.0112, -32.6532)).toBe('32.6532° S, 70.0112° W')
    expect(formatCoordinates(86.925, 27.9881)).toBe('27.9881° N, 86.9250° E')
  })

  it('rounds to four decimals', () => {
    expect(formatCoordinates(-121.38994, 47.43816)).toBe('47.4382° N, 121.3899° W')
  })

  it('treats values that round to zero as north and east', () => {
    expect(formatCoordinates(-0.00001, -0.00001)).toBe('0.0000° N, 0.0000° E')
  })
})
