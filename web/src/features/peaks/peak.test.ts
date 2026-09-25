import { describe, expect, it } from 'vitest'
import { peakFromFeature, type Peak } from './peak'

const kendall: Peak = { name: 'Kendall Peak', elevationM: 1762, lon: -121.3899, lat: 47.4381 }

describe('peakFromFeature', () => {
  const point = (coordinates: number[]) => ({ type: 'Point' as const, coordinates })

  it('reads name, elevation and coordinates', () => {
    const peak = peakFromFeature({
      geometry: point([-121.3899, 47.4381]),
      properties: { name: 'Kendall Peak', ele: 1762, class: 'peak', rank: 1 },
    })
    expect(peak).toEqual(kendall)
  })

  it('gives a null elevation when the tiles have none', () => {
    const peak = peakFromFeature({
      geometry: point([-121.4, 47.4]),
      properties: { name: 'Easter Island', class: 'peak' },
    })
    expect(peak?.elevationM).toBeNull()
  })

  it('rejects features without a name or that are not points', () => {
    expect(peakFromFeature({ geometry: point([0, 0]), properties: { ele: 100 } })).toBeNull()
    expect(
      peakFromFeature({
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        properties: { name: 'Ridge' },
      }),
    ).toBeNull()
  })
})
