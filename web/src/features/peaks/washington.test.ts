import { describe, expect, it } from 'vitest'
import { isInWashington } from './washington'

// Summit coordinates from OpenStreetMap, as [lon, lat].
const inside: Record<string, [number, number]> = {
  'Kendall Peak': [-121.38494, 47.44304],
  'Mount Defiance (Snoqualmie Pass)': [-121.56438, 47.43541],
  'Mount Rainier': [-121.75752, 46.8522],
  'Mount Baker': [-121.81457, 48.77677],
  'Mount Olympus': [-123.71091, 47.80122],
  'Steptoe Butte': [-117.29713, 47.03239],
  // An island peak, and two peaks within a few km of the Columbia River.
  'Mount Constitution (Orcas Island)': [-122.83102, 48.6776],
  'Dog Mountain (Columbia Gorge)': [-121.70045, 45.71695],
  'Hamilton Mountain (Columbia Gorge)': [-122.00526, 45.65103],
}

const outside: Record<string, [number, number]> = {
  'Mount Hood (Oregon)': [-121.69588, 45.37351],
  'Mount Defiance (Oregon)': [-121.7223, 45.64845],
  'Scotchman Peak (Idaho)': [-116.08184, 48.18882],
  'Hamilton Mountain (Idaho)': [-116.33963, 47.87297],
  'Slesse Mountain (British Columbia)': [-121.59746, 49.02541],
}

describe('isInWashington', () => {
  it.each(Object.entries(inside))('includes %s', (_, [lon, lat]) => {
    expect(isInWashington(lon, lat)).toBe(true)
  })

  it.each(Object.entries(outside))('excludes %s', (_, [lon, lat]) => {
    expect(isInWashington(lon, lat)).toBe(false)
  })

  it('excludes points outside the bounding box', () => {
    expect(isInWashington(0, 0)).toBe(false)
  })
})
