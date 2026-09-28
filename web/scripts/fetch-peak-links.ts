// One-time harvest of SummitPost and Peakbagger mountain pages and WTA hike
// pages in Washington, written as link indexes for the peak panel (PLAN.md 1.6).
// Steer never runs this; it keeps only each page's name, URL and location,
// never the sites' content.
//
//   node scripts/fetch-peak-links.ts [summitpost|peakbagger|wta]   (all by default)
//
// PEAK_LINKS.md explains the sources, the run, and how to add another state.
//
// SummitPost pages are found through the Wayback Machine, Peakbagger pages
// through Wikidata, and WTA hikes through the file behind WTA's hike map (see
// their sections below). The SummitPost run takes hours; its progress is saved
// to scripts/.cache/ after every request, and a rerun resumes.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'

export type LinkEntry = {
  name: string
  url: string
  lon: number
  lat: number
}

const USER_AGENT = 'SteerPeakLinks/1.0 (one-time link index; +https://github.com/alecswift/steer)'
const OUT_DIR = new URL('../src/features/peaks/data/', import.meta.url)
const CACHE_DIR = new URL('.cache/', import.meta.url)

const WTA_DELAY_MS = 60_000 // WTA robots.txt: Crawl-delay: 60, used between retries

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const OWN_HEADERS = { 'User-Agent': USER_AGENT }
const REQUEST_TIMEOUT_MS = 90_000 // a hung request is retried, not waited on forever

// Fetches a page as text, retrying 429, 5xx and dropped connections with
// backoff. A 429 waits for the server's Retry-After, or at least a minute, so
// a rate limit isn't pushed into a block. Returns null for a 404 or 410 (or
// other `missingStatuses`), so a removed page is skipped rather than ending
// the run.
async function fetchText(
  url: string,
  retryDelayMs: number,
  headers: Record<string, string> = OWN_HEADERS,
  init: RequestInit = {},
  missingStatuses = [404, 410],
): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers as Record<string, string>) },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      // A dropped connection (ECONNRESET, a timeout) is retried like a 5xx.
      if (attempt === 6) throw error
      console.warn(`${(error as Error).message} for ${url}, retrying in ${Math.round((retryDelayMs * 2 ** attempt) / 1000)} s (${attempt}/5)`)
      await sleep(retryDelayMs * 2 ** attempt)
      continue
    }
    if (response.ok) return response.text()
    if (missingStatuses.includes(response.status)) return null
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === 6) throw new Error(`${response.status} ${response.statusText} for ${url}`)
    const retryAfterMs = Number(response.headers.get('retry-after')) * 1000 || 0
    const waitMs = Math.max(retryAfterMs, retryDelayMs * 2 ** attempt, response.status === 429 ? 60_000 * attempt : 0)
    console.warn(`${response.status} for ${url}, retrying in ${Math.round(waitMs / 1000)} s (${attempt}/5)`)
    await sleep(waitMs)
  }
}

export function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match)
    .trim()
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5

// Writes through a temporary file, so stopping the script mid-write never
// leaves a half-written cache.
function writeJsonAtomic(file: URL, value: unknown) {
  const temp = new URL(`${file.href}.tmp`)
  writeFileSync(temp, JSON.stringify(value))
  renameSync(temp, file)
}

const PROGRESS_FILE = new URL('progress.txt', CACHE_DIR)

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60_000)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

// Tracks one phase of a run. Each step logs its count, percent and estimated
// time left, and rewrites scripts/.cache/progress.txt, which can be left open
// in an editor to watch the run. Counts include `cached` steps from earlier
// runs, so a restart doesn't reset the bar. Time left comes from the last 20
// steps, so a slow stretch of the server's doesn't skew it for hours.
function trackProgress(phase: string, total: number, cached = 0): (detail: string) => void {
  mkdirSync(CACHE_DIR, { recursive: true })
  const recent = [Date.now()]
  let done = cached
  return (detail) => {
    done++
    recent.push(Date.now())
    if (recent.length > 21) recent.shift()
    const fraction = total === 0 ? 1 : done / total
    const msPerStep = (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
    const left = formatDuration(msPerStep * (total - done))
    const bar = '█'.repeat(Math.round(fraction * 30)).padEnd(30, '░')
    const percent = `${(fraction * 100).toFixed(1)}%`
    console.log(`${phase} ${done}/${total} (${percent}, ${left} left): ${detail}`)
    writeFileSync(
      PROGRESS_FILE,
      `${phase}\n${bar} ${percent}\n${done} of ${total} done, about ${left} left\n` +
        `Last: ${detail}\nUpdated: ${new Date().toLocaleString()}\n`,
    )
  }
}

// Runs `task` on every item, at most `limit` at a time.
async function forEachLimited<T>(items: T[], limit: number, task: (item: T, index: number) => Promise<void>) {
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

function writeIndex(fileName: string, entries: LinkEntry[]) {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url))
  writeFileSync(new URL(fileName, OUT_DIR), JSON.stringify(sorted, null, 1) + '\n')
  console.log(`Wrote ${sorted.length} entries to src/features/peaks/data/${fileName}`)
}

// --- SummitPost -------------------------------------------------------------
//
// SummitPost refuses automated clients, so its pages are found in the Wayback
// Machine instead:
//   1. Washington's named peaks come from OpenStreetMap, which the base map's
//      tiles are built from.
//   2. Each name becomes URL slugs ("Mt. Si" gives mt-si and mount-si), and the
//      Wayback index is searched for mountain pages starting with each one. Only
//      mountain pages have a climbers log, so its URL marks them, and a prefix
//      search also finds slugs with a suffix (kendall-peak-6852).
//   3. Each candidate's archived page gives its type and coordinates. Mountains
//      in Washington's bounding box are kept; the app's outline check and
//      name-plus-distance match do the rest.
//   4. Wikidata's SummitPost IDs (CC0) add pages whose slug matches no OSM name.

const ARCHIVE_DELAY_MS = 1_000
const ARCHIVE_CONCURRENCY = 1 // archive.org answered 2 and 3 at a time with 429s
const SUMMITPOST_CACHE = new URL('summitpost.json', CACHE_DIR)
const WA_BOX = { west: -124.85, south: 45.54, east: -116.91, north: 49.01 }
const MAX_CANDIDATES = 40 // a stem this common is skipped rather than fetched

type SummitPostPage = { type: string; name: string; lon: number; lat: number }
type SummitPostCache = {
  slugs: Record<string, string[]> // slug -> "/slug/id" paths from the Wayback index
  pages: Record<string, SummitPostPage | null> // "/slug/id" -> parsed archived page
}

const inWashingtonBox = ({ lon, lat }: { lon: number; lat: number }) =>
  lon >= WA_BOX.west && lon <= WA_BOX.east && lat >= WA_BOX.south && lat <= WA_BOX.north

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// The slugs a SummitPost page for this peak might start with. Mount/Mt and
// Saint/St are swapped, as are Peak/Mountain, and a name that ends in either
// is also searched by its stem when the stem is long enough to be specific.
// Some peaks carry two names split by a slash, such as "Mount Si / q̓əlbc̓"
// with its Lushootseed name, and each part is a name of its own.
export const nameParts = (name: string) => name.split(/\s+\/\s+/).filter(Boolean)

export function slugVariants(name: string): string[] {
  const variants = new Set(nameParts(name).map(slugify).filter(Boolean))
  const swaps: [RegExp, string][] = [
    [/^mount-/, 'mt-'],
    [/^mt-/, 'mount-'],
    [/(^|-)st-/, '$1saint-'],
    [/(^|-)saint-/, '$1st-'],
    [/-peak$/, '-mountain'],
    [/-mountain$/, '-peak'],
  ]
  for (const slug of [...variants]) {
    for (const [pattern, replacement] of swaps) {
      if (pattern.test(slug)) variants.add(slug.replace(pattern, replacement))
    }
  }
  for (const slug of [...variants]) {
    const stem = slug.replace(/-(peak|mountain)$/, '')
    if (stem !== slug && stem.length >= 6) variants.add(stem)
  }
  return [...variants]
}

export async function fetchWashingtonPeakNames(): Promise<string[]> {
  const query =
    '[out:json][timeout:180];area["ISO3166-2"="US-WA"]->.wa;' +
    'node["natural"~"^(peak|volcano)$"]["name"](area.wa);out;'
  const body = await fetchText('https://overpass-api.de/api/interpreter', ARCHIVE_DELAY_MS, OWN_HEADERS, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  })
  if (body === null) throw new Error('Overpass returned no data')
  const { elements } = JSON.parse(body) as { elements: { tags: Record<string, string> }[] }
  return elements.map(({ tags }) => tags.name)
}

// Mountain page paths ("/slug/id") in the Wayback index whose slug is `slug`
// or starts with `slug-`, found through their climbers-log pages.
export async function findArchivedMountains(slug: string): Promise<string[]> {
  const params = new URLSearchParams({
    url: `summitpost.org/${slug}`,
    matchType: 'prefix',
    filter: `original:.*summitpost\\.org(:80)?/${slug}(-[a-z0-9-]+)?/climbers-log/[0-9]+/?$`,
    fl: 'original',
    collapse: 'urlkey',
  })
  // The Wayback Machine's own timemap endpoint takes CDX queries, and kept
  // answering during a CDX outage (503s and hangs) on 2026-09-27.
  const body = await fetchText(`https://web.archive.org/web/timemap/json?${params}`, ARCHIVE_DELAY_MS, OWN_HEADERS)
  const paths = new Set<string>()
  for (const [, pageSlug, id] of (body ?? '').matchAll(/summitpost\.org(?::80)?\/([a-z0-9-]+)\/climbers-log\/(\d+)/g)) {
    paths.add(`/${pageSlug}/${id}`)
  }
  return [...paths]
}

// Reads a SummitPost page from the Wayback Machine. The capture nearest to now
// is sometimes SummitPost's own Cloudflare block page, replayed as a 403 or
// with no "Page Type" field, so the page's latest captures that SummitPost
// answered with a 200 are tried instead, newest first.
export async function fetchArchivedSummitPost(path: string): Promise<string | null> {
  const page = `https://www.summitpost.org${path}`
  const archived = (timestamp: string) =>
    fetchText(`https://web.archive.org/web/${timestamp}id_/${page}`, ARCHIVE_DELAY_MS, OWN_HEADERS, {}, [403, 404, 410])
  const nearest = await archived('2026')
  if (nearest?.includes('Page Type')) return nearest

  await sleep(ARCHIVE_DELAY_MS)
  const params = new URLSearchParams({ url: `summitpost.org${path}`, filter: 'statuscode:200', fl: 'timestamp' })
  const captures = await fetchText(`https://web.archive.org/web/timemap/json?${params}`, ARCHIVE_DELAY_MS, OWN_HEADERS)
  const timestamps = [...(captures ?? '').matchAll(/"(\d{14})"/g)].map(([, timestamp]) => timestamp)
  for (const timestamp of timestamps.reverse().slice(0, 3)) {
    await sleep(ARCHIVE_DELAY_MS)
    const html = await archived(timestamp)
    if (html?.includes('Page Type')) return html
  }
  return null
}

// Reads an archived SummitPost page's type, title and coordinates.
export function parseSummitPostPage(html: string): SummitPostPage | null {
  const type = html.match(/Page Type:\s*<\/th>\s*<td>\s*([^<]+?)\s*<\/td>/)
  const name = html.match(/<h1 class="adventure-title[^"]*">([^<]+)/)
  const coords = html.match(/distance_lat_1=(-?[\d.]+)&(?:amp;)?distance_lon_1=(-?[\d.]+)[^>]*>[\d.]+&deg;/)
  if (!type || !name || !coords) return null
  return { type: type[1], name: decodeEntities(name[1]), lat: round5(Number(coords[1])), lon: round5(Number(coords[2])) }
}

// Mountains, summits, volcanoes and hills in Washington's bounding box that
// have Wikidata `property` (a site's page ID), keyed by that ID. The class
// filter drops parks and wilderness areas that carry the same ID property. Wikidata is CC0, so nothing here touches the
// site itself. `urlFor` is the property's formatter URL.
async function fetchWikidataLinks(property: string, urlFor: (id: string) => string): Promise<Map<string, LinkEntry>> {
  const box = (lon: number, lat: number) => `"Point(${lon} ${lat})"^^geo:wktLiteral`
  const query = `SELECT ?id ?label ?loc WHERE {
    SERVICE wikibase:box { ?item wdt:P625 ?loc .
      bd:serviceParam wikibase:cornerSouthWest ${box(WA_BOX.west, WA_BOX.south)} .
      bd:serviceParam wikibase:cornerNorthEast ${box(WA_BOX.east, WA_BOX.north)} . }
    VALUES ?class { wd:Q8502 wd:Q207326 wd:Q8072 wd:Q54050 }
    ?item wdt:${property} ?id ; wdt:P31/wdt:P279* ?class ; rdfs:label ?label . FILTER(LANG(?label) = "en") }`
  const body = await fetchText(`https://query.wikidata.org/sparql?${new URLSearchParams({ query })}`, ARCHIVE_DELAY_MS, {
    ...OWN_HEADERS,
    Accept: 'application/sparql-results+json',
  })
  const byId = new Map<string, LinkEntry>()
  if (body === null) return byId
  type Binding = Record<'id' | 'label' | 'loc', { value: string }>
  for (const { id, label, loc } of (JSON.parse(body) as { results: { bindings: Binding[] } }).results.bindings) {
    const point = loc.value.match(/Point\((-?[\d.]+) (-?[\d.]+)\)/)
    if (!point || byId.has(id.value)) continue
    byId.set(id.value, {
      name: label.value,
      url: urlFor(id.value),
      lon: round5(Number(point[1])),
      lat: round5(Number(point[2])),
    })
  }
  return byId
}

function readSummitPostCache(): SummitPostCache {
  try {
    return JSON.parse(readFileSync(SUMMITPOST_CACHE, 'utf8'))
  } catch {
    return { slugs: {}, pages: {} }
  }
}

async function harvestSummitPost() {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cache = readSummitPostCache()
  const save = () => writeJsonAtomic(SUMMITPOST_CACHE, cache)

  const names = await fetchWashingtonPeakNames()
  const slugs = [...new Set(names.flatMap((name) => slugVariants(name)))]
  const todo = slugs.filter((slug) => !(slug in cache.slugs))
  console.log(`SummitPost: ${names.length} OSM peaks, ${slugs.length} slugs, ${todo.length} left to search`)

  const searched = trackProgress('SummitPost 1/2: searching the Wayback index', slugs.length, slugs.length - todo.length)
  await forEachLimited(todo, ARCHIVE_CONCURRENCY, async (slug) => {
    cache.slugs[slug] = await findArchivedMountains(slug)
    save()
    searched(`${slug} → ${cache.slugs[slug].length} mountain pages`)
    await sleep(ARCHIVE_DELAY_MS)
  })

  // Only a stem search is capped: a peak's own name (bald-mountain) is always read.
  const nameSlugs = new Set(names.flatMap((name) => nameParts(name).map(slugify)))
  const paths = new Set<string>()
  for (const slug of slugs) {
    const found = cache.slugs[slug]
    if (found.length > MAX_CANDIDATES && !nameSlugs.has(slug)) console.warn(`Skipping ${slug}: ${found.length} candidates`)
    else for (const path of found) paths.add(path)
  }
  const pagesTodo = [...paths].filter((path) => !(path in cache.pages))
  console.log(`SummitPost: ${paths.size} candidate pages, ${pagesTodo.length} left to read`)

  const read = trackProgress('SummitPost 2/2: reading archived pages', paths.size, paths.size - pagesTodo.length)
  await forEachLimited(pagesTodo, ARCHIVE_CONCURRENCY, async (path) => {
    const html = await fetchArchivedSummitPost(path)
    const page = html === null ? null : parseSummitPostPage(html)
    cache.pages[path] = page
    save()
    read(`${path} → ${page ? `${page.type}, ${page.lat}, ${page.lon}` : 'not readable'}`)
    await sleep(ARCHIVE_DELAY_MS)
  })

  // Keyed by page ID, so a Wikidata entry never duplicates an archived one.
  const byId = await fetchWikidataLinks('P3309', (id) => `https://www.summitpost.org/page/${id}`)
  for (const path of paths) {
    const page = cache.pages[path]
    if (page?.type !== 'Mountain/Rock' || !inWashingtonBox(page)) continue
    const id = path.split('/')[2]
    byId.set(id, { name: page.name, url: `https://www.summitpost.org${path}`, lon: page.lon, lat: page.lat })
  }
  writeIndex('summitpost.json', [...byId.values()])
}

// --- Peakbagger -------------------------------------------------------------
//
// Peakbagger's terms forbid copying, mining or scraping any of its data, so
// its pages come only from Wikidata's Peakbagger IDs (P3109), about 750 in
// Washington's bounding box. Other peaks get a Peakbagger search link.

async function harvestPeakbagger() {
  const byId = await fetchWikidataLinks('P3109', (id) => `https://www.peakbagger.com/peak.aspx?pid=${id}`)
  writeIndex('peakbagger.json', [...byId.values()])
}

// --- WTA --------------------------------------------------------------------
//
// WTA's hike map loads every hike's trailhead from one GeoJSON file, so a
// single request, rather than one per hike page, gives every hike's name, URL,
// trailhead, length and gain. robots.txt doesn't disallow it.

const WTA_TRAILHEADS_URL = 'https://www.wta.org/@@hike-finder-webservice/trailheads'

type WtaTrailhead = {
  geometry: { coordinates: [number, number] } | null
  properties: { title?: string; url?: string; mileage?: number | null; gain?: number | null }
}

// A hike also keeps its length and elevation gain, for the peak panel's hike
// cards. WTA leaves them empty (or 0) for some hikes, and then they're left out.
export type WtaHike = LinkEntry & { lengthMi?: number; gainFt?: number }

export function parseWtaTrailheads(json: string): WtaHike[] {
  const { features } = JSON.parse(json) as { features: WtaTrailhead[] }
  return features.flatMap(({ geometry, properties: { title, url, mileage, gain } }) => {
    if (!geometry || !title || !url) return []
    const [lon, lat] = geometry.coordinates
    return [
      {
        name: decodeEntities(title),
        url,
        lon: round5(lon),
        lat: round5(lat),
        ...(mileage ? { lengthMi: mileage } : {}),
        ...(gain ? { gainFt: Math.round(gain) } : {}),
      },
    ]
  })
}

async function harvestWta() {
  const body = await fetchText(WTA_TRAILHEADS_URL, WTA_DELAY_MS)
  if (body === null) throw new Error(`${WTA_TRAILHEADS_URL} not found`)
  writeIndex('wta.json', parseWtaTrailheads(body))
}

// --- Main -------------------------------------------------------------------

if (import.meta.main) {
  const site = process.argv[2]
  if (site !== undefined && !['summitpost', 'peakbagger', 'wta'].includes(site)) {
    console.error('Usage: node scripts/fetch-peak-links.ts [summitpost|peakbagger|wta]')
    process.exit(1)
  }
  if (site === undefined || site === 'summitpost') await harvestSummitPost()
  if (site === undefined || site === 'peakbagger') await harvestPeakbagger()
  if (site === undefined || site === 'wta') await harvestWta()
}
