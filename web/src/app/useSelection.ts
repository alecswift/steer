import { useCallback, useReducer } from 'react'
import type { Peak } from '@/features/peaks/peak'
import { peakLinks } from '@/features/peaks/peakLinks'
import { isInWashington } from '@/features/peaks/washington'
import { track } from '@/telemetry'
import { initialSelection, selectionReducer } from './selection'

/** App-level selection state, with stable callbacks to select or clear a peak or select a route, and the selection telemetry. */
export function useSelection() {
  const [selection, dispatch] = useReducer(selectionReducer, initialSelection)

  // `at` is the click's DOM timestamp, on the performance.now() timeline.
  // The event waits for the peak's links, which load the link indexes the
  // first time; the latency metric uses `at`, so it isn't affected.
  const selectPeak = useCallback((peak: Peak, at: number) => {
    dispatch({ type: 'peakSelected', peak, at })
    void peakLinks(peak).then((links) =>
      track('peak.selected', {
        peak_name: peak.name,
        in_washington: isInWashington(peak.lon, peak.lat),
        has_exact_links: links.some((link) => link.kind === 'exact'),
      }),
    )
  }, [])
  const clearPeak = useCallback(() => dispatch({ type: 'peakCleared' }), [])

  // `at` is the click's DOM timestamp, for the select-to-fit latency.
  const selectRoute = useCallback((id: string, at: number) => {
    dispatch({ type: 'routeSelected', id, at })
    track('route.selected', { route_id: id })
  }, [])

  return { selection, selectPeak, clearPeak, selectRoute }
}
