import { describe, expect, it } from 'vitest'
import type { LngLat } from './editor'
import { emptyLegCache, failLeg, requestLegs, resolveLeg, routeLegs } from './legCache'
import { savePayload } from './savePayload'

const a: LngLat = [-121.4133, 47.42769]
const b: LngLat = [-121.4301, 47.4402]
const c: LngLat = [-121.45167, 47.45762]

const snappedAB = [[...a, 1000], [-121.42, 47.434, 1100], [...b, 1200]]
const straightBC = [[...b, 1200], [...c, 1300]]

// A, B, C with A to B snapped and B to C a straight leg Phoenix fell back to.
function cachedLegs() {
  let cache = resolveLeg(emptyLegCache, a, b, { coordinates: snappedAB, snapped: true })
  cache = resolveLeg(cache, b, c, { coordinates: straightBC, snapped: false })
  return routeLegs(cache, [a, b, c])
}

describe('savePayload', () => {
  it('turns the waypoints and their legs into the save body', () => {
    expect(savePayload([a, b, c], cachedLegs())).toEqual({
      waypoints: [
        { lon: a[0], lat: a[1] },
        { lon: b[0], lat: b[1] },
        { lon: c[0], lat: c[1] },
      ],
      legs: [
        { coordinates: snappedAB, snapped: true },
        { coordinates: straightBC, snapped: false },
      ],
    })
  })

  it('keeps a leg the editor fell back to as a straight line without Z, for Phoenix to fill', () => {
    const legs = routeLegs(failLeg(emptyLegCache, a, b), [a, b])
    expect(savePayload([a, b], legs)?.legs).toEqual([{ coordinates: [a, b], snapped: false }])
  })

  it('includes the name trimmed', () => {
    expect(savePayload([a, b, c], cachedLegs(), '  Snow Lake ')?.name).toBe('Snow Lake')
  })

  it.each(['', '   '])('leaves out a blank name, so Phoenix generates one: %j', (name) => {
    expect(savePayload([a, b, c], cachedLegs(), name)).not.toHaveProperty('name')
  })

  it('is null while a leg is pending', () => {
    const { cache } = requestLegs(resolveLeg(emptyLegCache, a, b, { coordinates: snappedAB, snapped: true }), [a, b, c])
    expect(savePayload([a, b, c], routeLegs(cache, [a, b, c]))).toBeNull()
  })

  it('is null with fewer than 2 waypoints', () => {
    expect(savePayload([], [])).toBeNull()
    expect(savePayload([a], [])).toBeNull()
  })

  it("is null when the legs don't match the waypoints", () => {
    expect(savePayload([a, b, c, a], cachedLegs())).toBeNull()
  })

  it('saves a closed loop with its closing leg', () => {
    let cache = resolveLeg(emptyLegCache, a, b, { coordinates: snappedAB, snapped: true })
    cache = resolveLeg(cache, b, c, { coordinates: straightBC, snapped: false })
    cache = resolveLeg(cache, c, a, { coordinates: [[...c, 1300], [...a, 1000]], snapped: true })
    const loop = [a, b, c, a]
    const payload = savePayload(loop, routeLegs(cache, loop))
    expect(payload?.waypoints).toHaveLength(4)
    expect(payload?.legs.map((leg) => leg.snapped)).toEqual([true, false, true])
  })
})
