# Peak link indexes: how they're made, and how to add a state

Steer's peak panel links a peak to its **SummitPost** and **Peakbagger** pages and to nearby **WTA** hikes. The exact pages come from three bundled link indexes in `src/features/peaks/data/` (`summitpost.json`, `peakbagger.json`, `wta.json`), made once by [`fetch-peak-links.ts`](fetch-peak-links.ts). Peaks the indexes miss get each site's search link. This file records how the indexes were made for Washington in September 2026, why each source was chosen, and what to change for another state.

Each index entry is only `{ name, url, lon, lat }`; WTA hikes also keep `lengthMi` and `gainFt`. Steer never runs the script and never copies the sites' content.

## Run it

From `web/`:

```sh
npm run peak-links                # all three
npm run peak-links summitpost     # hours to days (see below)
npm run peak-links peakbagger     # seconds
npm run peak-links wta            # seconds
```

- Progress for the long SummitPost run is in `scripts/.cache/progress.txt` (open it in the editor; it refreshes) and the full log is wherever you send stdout.
- Every lookup is cached in `scripts/.cache/summitpost.json` (git-ignored) as it goes, so a rerun resumes where it stopped. Stopping it with Ctrl-C is safe.
- For a long run, keep the Mac awake and detach it from the terminal:

  ```sh
  nohup node scripts/fetch-peak-links.ts summitpost > scripts/.cache/run.log 2>&1 &
  caffeinate -i -w $!    # idle sleep only; closing the lid still sleeps
  ```

## Sources, and why

These were checked between 2026-09-25 and 2026-09-28. Recheck the terms before reusing them.

| Site | Source used | Why not the site itself |
|---|---|---|
| SummitPost | Its pages as archived by the **Wayback Machine**, plus Wikidata's SummitPost IDs (P3309) | SummitPost answers automated clients with a Cloudflare 403, and its robots.txt blocks AI crawlers by name. Its terms bar reproducing "material or content" on other websites; page names, URLs and coordinates are facts, and Steer only links back. |
| Peakbagger | **Wikidata**'s Peakbagger IDs (P3109) only, which are CC0 | Peakbagger is behind a Cloudflare bot challenge, and its terms say "any unauthorized attempt to copy, duplicate, mine, scrape, or otherwise take any content from the site is copyright infringment and will be pursued to the extent of the law." So nothing is read from Peakbagger, not even through the archive. |
| WTA | The one GeoJSON file behind WTA's hike map, `https://www.wta.org/@@hike-finder-webservice/trailheads` | WTA allows crawlers but asks for 60 s between requests, so fetching 4,265 hike pages would take 71 hours. The map's file has every hike (more than the sitemap lists) in a single request, and robots.txt doesn't disallow it. |

Things that were tried and dropped:
- **Wikipedia** articles that link to SummitPost: only about 105 in Washington, some of them wilderness areas.
- **OpenStreetMap tags** pointing at SummitPost: 17 worldwide.
- **SummitPost's own state list pages** (`object_list.php?…&state_province_1=Washington`): they carry name, ID and coordinates for 24 mountains per page, but SummitPost refuses the script.

## How the SummitPost harvest works

1. **Peaks.** Every named `natural=peak` or `natural=volcano` node in the state, from OpenStreetMap through Overpass (3,348 for Washington). The base map's tiles are built from OSM, so these are the peaks the map shows.
2. **Slugs.** Each name becomes the URL slugs a SummitPost page might start with: Mount/Mt and Saint/St swapped, Peak and Mountain swapped, and the stem alone when it's at least 6 letters ("Kendall Peak" gives `kendall-peak`, `kendall-mountain`, `kendall`). Names with two parts split by a slash, such as "Mount Si / q̓əlbc̓", are split first. Washington gave 5,423 slugs.
3. **Index search.** For each slug, the Wayback index is searched for archived `…/<slug>[-suffix]/climbers-log/<id>` URLs. Only mountain and route pages have a climbers log, so this finds page IDs without guessing. The search goes through the Wayback Machine's `web/timemap/json` endpoint, which takes CDX queries; the CDX endpoint itself went down for most of a day during the Washington run. A stem with more than 40 hits (like `little` or `castle`) is skipped; a peak's own full name never is.
4. **Page reads.** Each candidate's archived page gives its type, name and coordinates. Only `Mountain/Rock` pages inside the state's bounding box are kept. If the capture nearest to now is SummitPost's own Cloudflare block page (a replayed 403, or a page with no "Page Type"), the page's latest captures that SummitPost served with a 200 are tried instead.
5. **Wikidata merge.** Wikidata items in the bounding box with a SummitPost ID, limited to mountains, summits, volcanoes and hills (so parks with the same property are left out), are added, with duplicate IDs removed.

### Rates and what went wrong

- **One request at a time, 1 s apart.** archive.org answered 2 and 3 at a time with 429s within minutes. A 429 waits for `Retry-After`, or at least a minute, so a rate limit isn't pushed into a block.
- Dropped connections (`ECONNRESET`) and hung requests (90 s timeout) are retried like 5xx errors.
- Washington took about 1.5 days of wall-clock time: roughly 8 hours of index search when archive.org was healthy, much longer during its outage, then about 3 hours of page reads for 3,271 candidates.

### Washington results (2026-09-28)

| Index | Entries |
|---|---|
| `summitpost.json` | 764 (754 from archived pages, 10 only in Wikidata) |
| `peakbagger.json` | 733 |
| `wta.json` | 3,649 hikes (3,218 with a length, 2,926 with a gain) |

949 of 3,348 OSM peaks (28%) have a SummitPost page within 1.5 km.

## Adding another state

### In the script (`fetch-peak-links.ts`)

- **`fetchWashingtonPeakNames`**: change the Overpass area, `area["ISO3166-2"="US-WA"]`, to the state's code (e.g. `US-OR`), and rename the function.
- **`WA_BOX`**: the state's bounding box. It's used both to keep archived SummitPost pages and to scope the Wikidata queries. The app's outline check does the exact filtering, so a box with a little margin is fine.
- **Output files**: `writeIndex` writes one file per site. For several states, either make the box and peaks per state and write `summitpost-<state>.json`, or widen them to cover every state and keep one file per site. One file per site keeps the app's matching unchanged.
- **WTA is Washington-only.** Another state needs its own hike source, which hasn't been researched. Check its terms and robots.txt, look for a data file behind its map before crawling pages, and keep only name, URL, trailhead and stats.
- The Peakbagger and SummitPost approaches carry over as they are.

### In the app (`src/features/peaks/`)

- **Outline**: `washington.json` and `isInWashington` in [`washington.ts`](../src/features/peaks/washington.ts). Make an outline for the new state the same way (below), and change the check to "is in a supported state".
- **`peakLinks.ts`**: `matchLinks` and `peakLinks` gate on `isInWashington`. The WTA site only makes sense for Washington peaks, so its links should be limited to Washington even when SummitPost and Peakbagger cover more states.
- **`PeakLinkList.tsx`**: the note "Links are available for Washington peaks only."
- **Telemetry**: `peak.selected` has `in_washington` (in `app/App.tsx`); consider an `in_supported_state` or `state` attribute instead.
- **Plan and spec**: FR-013, US6 and the "Peak links" decision all say Washington.

### Making a state outline

From the US Census Bureau's public-domain cartographic boundary file, with [mapshaper](https://github.com/mbloch/mapshaper) run through `npx` (nothing is added to the project):

```sh
curl -O https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip
unzip cb_2024_us_state_500k.zip -d cb_state
npx -y mapshaper@0.6 cb_state/cb_2024_us_state_500k.shp \
  -filter 'STUSPS=="WA"' \
  -filter-islands min-area=20km2 \
  -simplify interval=1000 keep-shapes \
  -filter-fields \
  -o format=geojson precision=0.0001 wa.json
```

The output is a GeometryCollection; keep only its one MultiPolygon geometry (`{"type":"MultiPolygon","coordinates":…}`). A 1 km tolerance gave Washington 672 points (13 KB). A coarser outline drifts several km along rivers like the Columbia and misplaces peaks near the border. Test peaks on both sides of every border, as `washington.test.ts` does.

## Checking a new index

- Every well-known peak in the state's default view has the right SummitPost and Peakbagger page (`peakLinks.test.ts` has examples, including two peaks named Mount Defiance 200 km apart).
- A peak with a two-part name still matches.
- Hike trailheads match the hike pages' own coordinates for a few hikes.
- Open a sample of exact links by hand in a normal browser.
