import type { MultiPolygon } from 'geojson'
import { outlineCheck } from './outline'
import outline from './washington.json'

// Washington State's outline: the US Census Bureau's 2024 cartographic
// boundary file (cb_2024_us_state_500k, public domain), simplified with
// mapshaper to a 1 km tolerance, with islands under 20 km² dropped. 1 km keeps
// peaks near the Columbia River and the 49th parallel on the right side; a
// coarser outline drifts several km along the river.

/** Whether a point is in Washington State, by the bundled outline. Exact peak links and WTA links are limited to it. */
export const isInWashington = outlineCheck(outline as MultiPolygon)
