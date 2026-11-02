import type { MultiPolygon } from 'geojson'
import { outlineCheck } from './outline'

// The United States' outline, including Alaska, Hawaii, Puerto Rico and the
// island areas: the US Census Bureau's 2024 cartographic boundary file
// (cb_2024_us_nation_5m, public domain), simplified to a 1 km tolerance with
// Douglas–Peucker, with islands under 5 km² dropped. A peak just across a
// border that lands inside only gains search links, which still work.
let check: Promise<(lon: number, lat: number) => boolean> | undefined

/** Whether a point is in the United States, by the outline, which (about 55 KB gzipped) loads on first use. */
export async function isInUnitedStates(lon: number, lat: number): Promise<boolean> {
  check ??= import('./unitedStates.json').then((outline) => outlineCheck(outline.default as MultiPolygon))
  try {
    return (await check)(lon, lat)
  } catch (error) {
    // The next call tries the import again.
    check = undefined
    throw error
  }
}
