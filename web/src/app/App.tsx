import { useCallback, useReducer } from 'react'
import type { Peak } from '@/features/peaks/peak'
import { track } from '@/telemetry'
import { MapView } from './MapView'
import { initialSelection, selectionReducer } from './selection'
import { Sidebar } from './Sidebar'
import './App.css'

/** Renders the map and sidebar with shared peak selection and selection telemetry. */
function App() {
  const [selection, dispatch] = useReducer(selectionReducer, initialSelection)

  // `at` is the click's DOM timestamp, on the performance.now() timeline.
  const selectPeak = useCallback((peak: Peak, at: number) => {
    dispatch({ type: 'peakSelected', peak, at })
    track('peak.selected', { peak_name: peak.name })
  }, [])
  const clearPeak = useCallback(() => dispatch({ type: 'peakCleared' }), [])

  return (
    <div className="app">
      <main className="app-map">
        <MapView onPeakClick={selectPeak} onEmptyClick={clearPeak} />
      </main>
      <Sidebar selectedPeak={selection.selectedPeak} onClosePeak={clearPeak} />
    </div>
  )
}

export default App
