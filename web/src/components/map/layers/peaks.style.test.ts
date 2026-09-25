import { createExpression, featureFilter, latest } from '@maplibre/maplibre-gl-style-spec'
import type { FilterSpecification, StylePropertySpecification } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import { peakLayerStyle } from './peaks.style'

// Properties as they appear in the OpenFreeMap mountain_peak tiles.
const kendall = { name: 'Kendall Peak', class: 'peak', ele: 1762, rank: 1 }
const rainier = { name: 'Mount Rainier', class: 'volcano', ele: 4392, rank: 1 }
const easterIsland = { name: 'Easter Island', class: 'peak', rank: 3 }
const pass = { name: 'Snoqualmie Pass', class: 'saddle', ele: 919, rank: 2 }
const unnamed = { class: 'peak', ele: 1500, rank: 4 }

const zoom = { zoom: 12 }
const feature = (properties: Record<string, unknown>) => ({ type: 1 as const, properties })

describe('peak layer', () => {
  const filter = featureFilter(peakLayerStyle.filter as FilterSpecification, 'filter')
  const shows = (props: Record<string, unknown>) => filter.filter(zoom, feature(props))

  it('shows named peaks and volcanoes, including peaks with no elevation', () => {
    expect(shows(kendall)).toBe(true)
    expect(shows(rainier)).toBe(true)
    expect(shows(easterIsland)).toBe(true)
  })

  it('leaves out saddles and unnamed points', () => {
    expect(shows(pass)).toBe(false)
    expect(shows(unnamed)).toBe(false)
  })

  it('places lower ranks first, then higher peaks within a rank', () => {
    const parsed = createExpression(
      peakLayerStyle.layout!['symbol-sort-key'],
      'symbol-sort-key',
      latest.layout_symbol['symbol-sort-key'] as unknown as StylePropertySpecification,
    )
    if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value))
    const key = (props: Record<string, unknown>) => parsed.value.evaluate(zoom, feature(props))

    expect(key(rainier)).toBeLessThan(key(kendall))
    expect(key({ ...kendall, rank: 1 })).toBeLessThan(key({ ...rainier, rank: 2 }))
    expect(key(kendall)).toBeLessThan(key(easterIsland))
  })
})
