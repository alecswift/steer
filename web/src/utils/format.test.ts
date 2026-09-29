import { describe, expect, it } from 'vitest'
import { formatFeet, formatMiles } from './format'

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
