import { metrics, track } from '@/telemetry'
import { formatCoordinates, formatFeet } from './format'
import type { Peak } from './peak'
import { usePaintLatency } from './usePaintLatency'
import './PeakPanel.css'

// SC-006: click-to-panel-render latency, p95 under 100 ms.
const selectToPanel = metrics.histogram('steer.peak.select_to_panel_ms', {
  description: 'Time from clicking a peak until its details panel has painted',
  advice: {
    explicitBucketBoundaries: [5, 10, 16, 25, 33, 50, 75, 100, 150, 250, 500, 1000],
  },
})

type Props = {
  peak: Peak
  // When the peak was clicked, on the performance.now() timeline.
  selectedAt: number
  onClose: () => void
}

/** Shows a selected peak's name, elevation and coordinates, and records how long it took to appear. */
export function PeakPanel({ peak, selectedAt, onClose }: Props) {
  // The event carries the same value for the SC-006 panels, because Loki
  // counts every click, while the histogram can miss the first one after a
  // page load (see the dashboard description).
  usePaintLatency(selectedAt, (ms) => {
    selectToPanel.record(ms)
    track('peak.panel_shown', { peak_name: peak.name, select_to_panel_ms: ms })
  })

  return (
    <section className="peak-panel" aria-labelledby="peak-panel-title">
      <header className="peak-panel-header">
        <h2 id="peak-panel-title" className="peak-panel-title">
          {peak.name}
        </h2>
        <button
          type="button"
          className="peak-panel-close"
          onClick={onClose}
          aria-label="Close peak details"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      {peak.elevationFt === null ? (
        <p className="peak-panel-elevation peak-panel-elevation--unknown">Elevation unknown</p>
      ) : (
        <p className="peak-panel-elevation">{formatFeet(peak.elevationFt)}</p>
      )}
      <p className="peak-panel-coordinates">{formatCoordinates(peak.lon, peak.lat)}</p>
    </section>
  )
}
