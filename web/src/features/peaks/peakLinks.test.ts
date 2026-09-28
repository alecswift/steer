import { describe, expect, it } from 'vitest'
import type { Peak } from './peak'
import { matchLinks, normalizeName, peakLinks, type LinkEntry, type LinkIndexes } from './peakLinks'
import peakbagger from './data/peakbagger.json'
import summitpost from './data/summitpost.json'
import wta from './data/wta.json'

// Summit coordinates from OpenStreetMap, which the map tiles are built from.
const peak = (name: string, lon: number, lat: number): Peak => ({ name, elevationFt: null, lon, lat })
const kendall = peak('Kendall Peak', -121.38494, 47.44304)
const defiance = peak('Mount Defiance', -121.56438, 47.43541)
const si = peak('Mount Si / q̓əlbc̓', -121.73902, 47.50689)
const littleBandera = peak('Little Bandera Mountain', -121.54781, 47.41801)

const indexes: LinkIndexes = { summitpost, peakbagger, wta }
const noIndexes: LinkIndexes = { summitpost: [], peakbagger: [], wta: [] }

const urls = (links: { site: string; kind: string; url: string }[], site: string) =>
  links.filter((link) => link.site === site).map((link) => `${link.kind} ${link.url}`)

describe('normalizeName', () => {
  it('treats Mt/Mount and St/Saint, case, accents and punctuation alike', () => {
    expect(normalizeName('Mt. St. Helens')).toBe('mount saint helens')
    expect(normalizeName('MOUNT SAINT HELENS')).toBe('mount saint helens')
    expect(normalizeName("Putrid Pete's Péak")).toBe('putrid petes peak')
  })
})

describe('matchLinks', () => {
  it('links the exact SummitPost and Peakbagger pages for the 0.3 table peaks', () => {
    expect(urls(matchLinks(kendall, indexes), 'summitpost')).toEqual(['exact https://www.summitpost.org/kendall-peak/151396'])
    expect(urls(matchLinks(kendall, indexes), 'peakbagger')).toEqual(['exact https://www.peakbagger.com/peak.aspx?pid=2110'])
  })

  it('gives Mount Defiance near Snoqualmie Pass its own page, not Oregon’s', () => {
    expect(urls(matchLinks(defiance, indexes), 'summitpost')).toEqual([
      'exact https://www.summitpost.org/mount-defiance/151438',
    ])
  })

  it('never lends an exact page to a same-named peak far away', () => {
    const elsewhere = peak('Kendall Peak', -120.5, 47.44)
    expect(urls(matchLinks(elsewhere, indexes), 'summitpost')).toEqual([
      'search https://www.summitpost.org/object_list.php?object_type=1&object_name_1=Kendall+Peak',
    ])
  })

  it('matches each part of a two-part name, and searches by the first', () => {
    const links = matchLinks(si, indexes)
    expect(urls(links, 'summitpost')).toEqual(['exact https://www.summitpost.org/mount-si/150709'])
    expect(urls(links, 'peakbagger')).toEqual(['exact https://www.peakbagger.com/peak.aspx?pid=2087'])
    expect(urls(matchLinks(si, noIndexes), 'wta')).toEqual([
      'search https://www.wta.org/go-outside/hikes/hike_search?title=Mount+Si',
    ])
  })

  it('lists up to three WTA hikes, the one named after the peak first', () => {
    const hikes = matchLinks(kendall, indexes).filter((link) => link.site === 'wta')
    expect(hikes.map((hike) => hike.title)).toEqual(['Kendall Peak', 'Kendall Peak Lakes', 'Kendall Peak Lakes Snowshoe'])
    expect(hikes.every((hike) => hike.kind === 'exact')).toBe(true)
  })

  it('matches a hike that starts with the peak’s name, but not one that only mentions it', () => {
    // A trailhead 2 km south of the peak, well within range.
    const titles = (hikeName: string, of: Peak) => {
      const hike: LinkEntry = { name: hikeName, url: 'https://wta.test/hike', lon: of.lon, lat: of.lat - 0.018 }
      const links = matchLinks(of, { ...noIndexes, wta: [hike] })
      return links.flatMap((link) => (link.site === 'wta' ? [link.title ?? link.kind] : []))
    }

    expect(titles('Kendall Katwalk', kendall)).toEqual(['Kendall Katwalk'])
    expect(titles('Thompson Lake via Mount Defiance', defiance)).toEqual(['Thompson Lake via Mount Defiance'])
    const snoqualmie = peak('Snoqualmie Mountain', -121.41654, 47.45899)
    expect(titles('Pacific Crest Trail - Snoqualmie Pass to Olallie Meadow', snoqualmie)).toEqual(['search'])
  })

  it('falls back to each site’s search where the indexes have nothing', () => {
    expect(matchLinks(littleBandera, noIndexes)).toEqual([
      {
        site: 'summitpost',
        kind: 'search',
        url: 'https://www.summitpost.org/object_list.php?object_type=1&object_name_1=Little+Bandera+Mountain',
      },
      { site: 'peakbagger', kind: 'search', url: 'https://www.peakbagger.com/search.aspx?tid=M&ss=Little+Bandera+Mountain' },
      {
        site: 'wta',
        kind: 'search',
        url: 'https://www.wta.org/go-outside/hikes/hike_search?title=Little+Bandera+Mountain',
      },
    ])
  })

  it('encodes punctuation in search names', () => {
    const [summitpostLink] = matchLinks(peak("Mount St. Helens & Jack's Peak", -122.18, 46.19), noIndexes)
    expect(new URL(summitpostLink.url).searchParams.get('object_name_1')).toBe("Mount St. Helens & Jack's Peak")
    expect(summitpostLink.url).toContain('object_name_1=Mount+St.+Helens+%26+Jack%27s+Peak')
  })

  it('gives no links for a peak outside Washington', () => {
    expect(matchLinks(peak('Mount Hood', -121.69588, 45.37351), indexes)).toEqual([])
    expect(matchLinks(peak('Mount Defiance', -121.7223, 45.64845), indexes)).toEqual([])
  })
})

describe('peakLinks', () => {
  it('loads the indexes and matches against them', async () => {
    expect(urls(await peakLinks(kendall), 'summitpost')).toEqual(['exact https://www.summitpost.org/kendall-peak/151396'])
  })

  it('gives no links outside Washington', async () => {
    expect(await peakLinks(peak('Mount Hood', -121.69588, 45.37351))).toEqual([])
  })
})
