import { useRoutes } from '@/features/routes/useRoutes'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { useSelection } from './useSelection'
import './App.css'

/** Renders the map and sidebar with the saved routes and shared peak and route selection. */
function App() {
  const routes = useRoutes()
  const { selection, selectPeak, clearPeak, selectRoute } = useSelection()
  const selectedRoute =
    routes && 'routes' in routes ? (routes.routes.find((route) => route.id === selection.selectedRoute?.id) ?? null) : null

  return (
    <div className="app">
      <main className="app-map">
        <MapView
          route={selectedRoute}
          selectedRoute={selection.selectedRoute}
          onPeakClick={selectPeak}
          onEmptyClick={clearPeak}
        />
      </main>
      <Sidebar
        routes={routes}
        selectedRoute={selectedRoute}
        selectedPeak={selection.selectedPeak}
        onSelectRoute={selectRoute}
        onClosePeak={clearPeak}
      />
    </div>
  )
}

export default App
