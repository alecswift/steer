import { EditToolbar } from '@/features/routes/EditToolbar'
import { useRoutes } from '@/features/routes/useRoutes'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { useMode } from './useMode'
import { useSelection } from './useSelection'
import './App.css'

/**
 * Renders the map with the sidebar in view mode, or the edit toolbar in edit
 * mode, sharing the saved routes, the peak and route selection, and the mode.
 */
function App() {
  const routes = useRoutes()
  const { selection, selectPeak, clearPeak, selectRoute } = useSelection()
  const { mode, createRoute, leaveEditMode, edit } = useMode()
  const selectedRoute =
    routes && 'routes' in routes ? (routes.routes.find((route) => route.id === selection.selectedRoute?.id) ?? null) : null

  // The sidebar is hidden while editing, so a selected peak's panel would
  // otherwise reappear on leaving edit mode.
  function handleCreateRoute() {
    clearPeak()
    createRoute()
  }

  return (
    <div className="app">
      <main className="app-map">
        <MapView
          route={selectedRoute}
          selectedRoute={selection.selectedRoute}
          editWaypoints={mode.name === 'edit' ? mode.editor.present.waypoints : null}
          onPeakClick={selectPeak}
          onEmptyClick={clearPeak}
          onAddPoint={(point) => edit({ type: 'ADD_POINT', point })}
        />
      </main>
      {mode.name === 'edit' ? (
        <EditToolbar editor={mode.editor} onAction={edit} onCancel={leaveEditMode} />
      ) : (
        <Sidebar
          routes={routes}
          selectedRoute={selectedRoute}
          selectedPeak={selection.selectedPeak}
          onSelectRoute={selectRoute}
          onClosePeak={clearPeak}
          onCreateRoute={handleCreateRoute}
        />
      )}
    </div>
  )
}

export default App
