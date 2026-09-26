import { describe, expect, it } from 'vitest'
import { formatCoordinates, formatFeet } from './format'

describe('formatFeet', () => {
  it('adds thousands separators and the unit', () => {
    expect(formatFeet(5781)).toBe('5,781 ft') // Kendall Peak
    expect(formatFeet(14411)).toBe('14,411 ft')
  })

  it('shows small and zero values without a separator', () => {
    expect(formatFeet(0)).toBe('0 ft')
    expect(formatFeet(328)).toBe('328 ft')
  })

  it('rounds to the nearest foot', () => {
    expect(formatFeet(1000.4)).toBe('1,000 ft')
    expect(formatFeet(1000.6)).toBe('1,001 ft')
  })

  it('keeps the sign for places below sea level', () => {
    expect(formatFeet(-282)).toBe('-282 ft')
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
