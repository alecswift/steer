import { PeakPanel } from '@/features/peaks/PeakPanel'
import type { SelectedPeak } from './selection'
import './Sidebar.css'

type Props = {
  selectedPeak: SelectedPeak | null
  onClosePeak: () => void
}

/** Shows the selected peak's details, or prompts the user to select a peak. */
export function Sidebar({ selectedPeak, onClosePeak }: Props) {
  return (
    <aside className="sidebar" aria-label="Details">
      <div aria-live="polite">
        {selectedPeak ? (
          <PeakPanel peak={selectedPeak} selectedAt={selectedPeak.selectedAt} onClose={onClosePeak} />
        ) : (
          <p className="sidebar-empty">Select a peak on the map to see its details.</p>
        )}
      </div>
    </aside>
  )
}
