import type { SelectedPeak } from './selection'
import './Sidebar.css'

type Props = {
  selectedPeak: SelectedPeak | null
  onClosePeak: () => void
}

/** Shows the selected peak with a close button, or prompts the user to select a peak. */
export function Sidebar({ selectedPeak, onClosePeak }: Props) {
  return (
    <aside className="sidebar" aria-label="Details">
      <div aria-live="polite">
        {selectedPeak ? (
          <section className="sidebar-panel" aria-labelledby="peak-panel-title">
            <header className="sidebar-panel-header">
              <h2 id="peak-panel-title" className="sidebar-panel-title">
                {selectedPeak.name}
              </h2>
              <button
                type="button"
                className="sidebar-close"
                onClick={onClosePeak}
                aria-label="Close peak details"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </header>
          </section>
        ) : (
          <p className="sidebar-empty">Select a peak on the map to see its details.</p>
        )}
      </div>
    </aside>
  )
}
