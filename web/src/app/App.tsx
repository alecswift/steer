import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { useSelection } from './useSelection'
import './App.css'

/** Renders the map and sidebar with shared peak selection. */
function App() {
  const { selection, selectPeak, clearPeak } = useSelection()

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
