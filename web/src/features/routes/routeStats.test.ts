import { describe, expect, it } from 'vitest'
import type { LngLat } from './editor'
import type { RouteLeg } from './legCache'
import { gainAndLoss, haversineM, joinLegs, routeStats } from './routeStats'

const a: LngLat = [-121.4133, 47.42769]
const b: LngLat = [-121.4301, 47.4402]
const c: LngLat = [-121.45167, 47.45762]

const leg = (status: RouteLeg['status'], coordinates: GeoJSON.Position[]): RouteLeg => ({
  from: [coordinates[0][0], coordinates[0][1]],
  to: [coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]],
  status,
  coordinates,
})

describe('haversineM', () => {
  it('is zero between a point and itself', () => {
    expect(haversineM(a, a)).toBe(0)
  })

  it('measures a degree of latitude as about 111.2 km', () => {
    expect(haversineM([-121, 47], [-121, 48])).toBeCloseTo(111_195, -1)
  })

  it('ignores elevation, so distance is map distance', () => {
    expect(haversineM([...a, 0], [...b, 1000])).toBe(haversineM(a, b))
  })
})

describe('joinLegs', () => {
  it('drops the vertex where one leg ends and the next starts', () => {
    expect(
      joinLegs([
        [[...a, 1], [...b, 2]],
        [[...b, 2], [...c, 3]],
      ]),
    ).toEqual([[...a, 1], [...b, 2], [...c, 3]])
  })

  it('keeps both ends when they differ, like a fallback from the clicked point', () => {
    expect(joinLegs([[[...a, 1], [...b, 2]], [[b[0], b[1] + 0.0001, 2], [...c, 3]]])).toHaveLength(4)
  })
})

// The same cases as Steer.Routes.StatsTest, so the two agree.
describe('gainAndLoss', () => {
  it.each([
    ['a flat line', [100, 100], 0, 0],
    ['a climbing line', [100, 150, 200], 100, 0],
    ['a line that goes up then down', [100, 250, 400, 250, 120], 300, 280],
    ['wobbles within 5 m', [100, 102, 100, 105, 101, 100], 0, 0],
    ['a climb in full across a dip within 5 m', [100, 150, 146, 200], 100, 0],
    ['a climb that starts after a small dip from its lowest point', [100, 97, 106], 9, 0],
    ['a descent that ends the line', [100, 150, 120], 50, 30],
    ['a final climb within 5 m', [150, 100, 104], 0, 50],
    ['rolling terrain above the threshold', [100, 106, 100, 106, 100, 106], 18, 12],
  ])('%s', (_name, elevations, gainM, lossM) => {
    expect(gainAndLoss(elevations)).toEqual({ gainM, lossM })
  })

  it('is zero for no elevations', () => {
    expect(gainAndLoss([])).toEqual({ gainM: 0, lossM: 0 })
  })
})

describe('routeStats', () => {
  it('is null for no legs', () => {
    expect(routeStats([])).toBeNull()
  })

  it('totals the distance, gain and loss across the joined legs', () => {
    const stats = routeStats([
      leg('snapped', [[...a, 1000], [...b, 1100]]),
      leg('snapped', [[...b, 1100], [...c, 1050]]),
    ])
    expect(stats).toEqual({ distanceM: haversineM(a, b) + haversineM(b, c), gainM: 100, lossM: 50 })
  })

  it('counts a climb across a leg boundary once', () => {
    // Split as one leg, it would be 100 up then 100 up again from 1100.
    const stats = routeStats([
      leg('snapped', [[...a, 1000], [...b, 1100]]),
      leg('snapped', [[...b, 1100], [...c, 1200]]),
    ])
    expect(stats).toMatchObject({ gainM: 200, lossM: 0 })
  })

  it('includes a straight leg Phoenix fell back to, which has elevation', () => {
    expect(routeStats([leg('straight', [[...a, 1000], [...b, 1020]])])).toMatchObject({ gainM: 20 })
  })

  it('is null while a leg is pending', () => {
    expect(routeStats([leg('snapped', [[...a, 1000], [...b, 1100]]), leg('pending', [b, c])])).toBeNull()
  })

  it('is null when a leg fell back in the browser, with no elevation', () => {
    expect(routeStats([leg('snapped', [[...a, 1000], [...b, 1100]]), leg('straight', [b, c])])).toBeNull()
  })
})
