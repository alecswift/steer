import { log } from '@/telemetry'
import type { Peak } from './peak'
import { isInWashington } from './washington'

export type PeakLinkSite = 'summitpost' | 'peakbagger' | 'wta'

// An exact page from a link index, or a search for the peak's name. A matched
// WTA hike also carries its name, length and gain, when WTA has them.
export type PeakLink = {
  site: PeakLinkSite
  kind: 'exact' | 'search'
  url: string
  title?: string
  lengthMi?: number
  gainFt?: number
}

// One page from a link index (scripts/fetch-peak-links.ts, PLAN.md 1.6). A WTA
// hike's location is its trailhead.
export type LinkEntry = { name: string; url: string; lon: number; lat: number }
export type WtaHike = LinkEntry & { lengthMi?: number; gainFt?: number }
export type LinkIndexes = { summitpost: LinkEntry[]; peakbagger: LinkEntry[]; wta: WtaHike[] }

const EXACT_KM = 1.5 // index coordinates and the tiles' summits agree to well under this
const HIKE_KM = 10 // trailheads are often several km from the summit
const MAX_HIKES = 3

const SITES: PeakLinkSite[] = ['summitpost', 'peakbagger', 'wta']

// Each site's own name search, in the form its search page submits (checked
// against captured searches on 2026-09-28): SummitPost's mountain list,
// Peakbagger's mountain search (tid=M), and WTA's hike finder by title.
const searchUrls: Record<PeakLinkSite, (name: string) => string> = {
  summitpost: (name) =>
    `https://www.summitpost.org/object_list.php?${new URLSearchParams({ object_type: '1', object_name_1: name })}`,
  peakbagger: (name) => `https://www.peakbagger.com/search.aspx?${new URLSearchParams({ tid: 'M', ss: name })}`,
  wta: (name) => `https://www.wta.org/go-outside/hikes/hike_search?${new URLSearchParams({ title: name })}`,
}

// Some peaks carry two names split by a slash, such as "Mount Si / q̓əlbc̓"
// with its Lushootseed name. Each part is matched on its own, and searches use
// the first.
const nameParts = (name: string) => name.split(/\s+\/\s+/).filter(Boolean)

// "Mt. St. Helens" and "Mount Saint Helens" both give "mount saint helens".
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\bmt\b/g, 'mount')
    .replace(/\bst\b/g, 'saint')
}

// A name without the words that only say it's a peak: "Kendall Peak" gives
// "kendall", "Mount Si" gives "si".
const coreName = (normalized: string) =>
  normalized
    .replace(/\b(mount|peak|mountain|mountains)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function distanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 12_742 * Math.asin(Math.sqrt(h))
}

// The nearest page within EXACT_KM whose name matches one of the peak's
// names. The distance check keeps a different peak with the same name, such
// as Mount Defiance in Oregon, from lending its page.
function exactPage(names: string[], peak: Peak, entries: LinkEntry[]): LinkEntry | undefined {
  let best: { entry: LinkEntry; km: number } | undefined
  for (const entry of entries) {
    if (!nameParts(entry.name).some((part) => names.includes(normalizeName(part)))) continue
    const km = distanceKm(peak, entry)
    if (km <= EXACT_KM && (!best || km < best.km)) best = { entry, km }
  }
  return best?.entry
}

// WTA hikes rarely carry the peak's exact name, so a hike within HIKE_KM
// matches when its name contains one of the peak's full names ("Thompson Lake
// via Mount Defiance"), or starts with one without Mount/Peak/Mountain
// ("Kendall Katwalk" for Kendall Peak). Hikes named exactly after the peak
// come first, then those containing its full name, then the rest, each
// nearest first.
function matchingHikes(names: string[], peak: Peak, entries: WtaHike[]): WtaHike[] {
  const cores = names.map(coreName).filter(Boolean)
  const ranked: { entry: WtaHike; rank: number; km: number }[] = []
  for (const entry of entries) {
    const hike = normalizeName(entry.name)
    const rank = names.includes(hike)
      ? 0
      : names.some((name) => ` ${hike} `.includes(` ${name} `))
        ? 1
        : cores.some((core) => `${hike} `.startsWith(`${core} `))
          ? 2
          : -1
    if (rank < 0) continue
    const km = distanceKm(peak, entry)
    if (km <= HIKE_KM) ranked.push({ entry, rank, km })
  }
  ranked.sort((a, b) => a.rank - b.rank || a.km - b.km)
  return ranked.slice(0, MAX_HIKES).map(({ entry }) => entry)
}

/** Links for a peak in Washington: each site's exact pages where the indexes have them, and its search otherwise. None outside Washington. */
export function matchLinks(peak: Peak, indexes: LinkIndexes): PeakLink[] {
  if (!isInWashington(peak.lon, peak.lat)) return []
  const parts = nameParts(peak.name)
  const names = parts.map(normalizeName).filter(Boolean)
  return SITES.flatMap((site): PeakLink[] => {
    const exact =
      site === 'wta'
        ? matchingHikes(names, peak, indexes.wta).map(({ url, name, lengthMi, gainFt }) => ({ url, title: name, lengthMi, gainFt }))
        : [exactPage(names, peak, indexes[site])].flatMap((entry) => (entry ? [{ url: entry.url }] : []))
    if (exact.length > 0) return exact.map((link) => ({ site, kind: 'exact', ...link }))
    return [{ site, kind: 'search', url: searchUrls[site](parts[0] ?? peak.name) }]
  })
}

const noIndexes: LinkIndexes = { summitpost: [], peakbagger: [], wta: [] }
let indexes: Promise<LinkIndexes> | undefined

// The indexes are about 130 KB gzipped, mostly WTA, so they load on first use
// rather than with the app.
function loadIndexes(): Promise<LinkIndexes> {
  indexes ??= Promise.all([import('./data/summitpost.json'), import('./data/peakbagger.json'), import('./data/wta.json')]).then(
    ([summitpost, peakbagger, wta]) => ({ summitpost: summitpost.default, peakbagger: peakbagger.default, wta: wta.default }),
  )
  return indexes
}

/** Links for a peak (see `matchLinks`), loading the link indexes the first time a Washington peak needs them. */
export async function peakLinks(peak: Peak): Promise<PeakLink[]> {
  if (!isInWashington(peak.lon, peak.lat)) return []
  try {
    return matchLinks(peak, await loadIndexes())
  } catch (error) {
    // Search links still work without the indexes; the next peak tries again.
    indexes = undefined
    log.error('Could not load the peak link indexes', { 'error.source': 'peak_links' }, error)
    return matchLinks(peak, noIndexes)
  }
}
