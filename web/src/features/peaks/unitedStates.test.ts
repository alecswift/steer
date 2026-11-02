import { describe, expect, it } from 'vitest'
import { isInUnitedStates } from './unitedStates'

// Summit coordinates, as [lon, lat].
const inside: Record<string, [number, number]> = {
  'Mount Rainier': [-121.75752, 46.8522],
  'Mount Hood (Oregon)': [-121.69588, 45.37351],
  'Scotchman Peak (Idaho)': [-116.08184, 48.18882],
  'Mount Whitney (California)': [-118.2923, 36.5785],
  'Emory Peak (Texas, near the Mexican border)': [-103.3015, 29.2463],
  'Mount Mitchell (North Carolina)': [-82.2651, 35.765],
  'Mount Washington (New Hampshire)': [-71.3033, 44.2706],
  'Cadillac Mountain (Mount Desert Island, Maine)': [-68.2245, 44.3526],
  'Denali (Alaska)': [-151.0074, 63.0695],
  'Kiska Volcano (Aleutians, west of 180°)': [177.602, 52.103],
  'Mauna Kea (Hawaii)': [-155.4681, 19.8207],
  'Cerro de Punta (Puerto Rico)': [-66.5917, 18.1722],
}

const outside: Record<string, [number, number]> = {
  'Slesse Mountain (British Columbia)': [-121.59746, 49.02541],
  'Mount Robson (British Columbia)': [-119.1564, 53.1104],
  'Mount Logan (Yukon)': [-140.4053, 60.5672],
  'Pico de Orizaba (Mexico)': [-97.2686, 19.0303],
  'Mount Fuji (Japan)': [138.7274, 35.3606],
}

describe('isInUnitedStates', () => {
  it.each(Object.entries(inside))('includes %s', async (_, [lon, lat]) => {
    expect(await isInUnitedStates(lon, lat)).toBe(true)
  })

  it.each(Object.entries(outside))('excludes %s', async (_, [lon, lat]) => {
    expect(await isInUnitedStates(lon, lat)).toBe(false)
  })
})
