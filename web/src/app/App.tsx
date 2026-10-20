import type { Route } from '@/features/routes/api'
import { isDirty } from '@/features/routes/editor'
import { EditToolbar } from '@/features/routes/EditToolbar'
import { loadRoute } from '@/features/routes/loadRoute'
import { useEditorLegs } from '@/features/routes/useEditorLegs'
import { useRoutes } from '@/features/routes/useRoutes'
import { useUnsavedChangesWarning } from '@/features/routes/useUnsavedChangesWarning'
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
  const { routes, addRoute, replaceRoute, removeRoute } = useRoutes()
  const { selection, selectPeak, clearPeak, selectRoute, clearRoute } = useSelection()
  const { mode, createRoute, editRoute, leaveEditMode, edit } = useMode()
  const editWaypoints = mode.name === 'edit' ? mode.editor.present.waypoints : null
  const { legs: editLegs, loadLegs } = useEditorLegs(editWaypoints)
  const unsaved = mode.name === 'edit' && isDirty(mode.editor, mode.openedWith)
  useUnsavedChangesWarning(unsaved)
  const selectedRoute =
    routes && 'routes' in routes ? (routes.routes.find((route) => route.id === selection.selectedRoute?.id) ?? null) : null

  // The sidebar is hidden while editing, so a selected peak's panel would
  // otherwise reappear on leaving edit mode.
  function handleCreateRoute() {
    clearPeak()
    createRoute()
  }

  // Opens a saved route in the editor with the legs it was saved with, so
  // it's drawn as it was and none is requested again.
  function handleEditRoute(route: Route) {
    const { waypoints, legs } = loadRoute(route)
    clearPeak()
    loadLegs(legs)
    editRoute(route, waypoints)
  }

  // Back in view mode, the route is listed (a new one at the top, an edited
  // one where it was) and selected, so it's drawn and framed with its stats
  // in the sidebar.
  function handleSaved(route: Route) {
    if (mode.name === 'edit' && mode.route) replaceRoute(route)
    else addRoute(route)
    leaveEditMode()
    selectRoute(route.id, performance.now())
  }

  // Gone from the list, the selection and so the map.
  function handleRouteDeleted(id: string) {
    removeRoute(id)
    clearRoute()
  }

  return (
    <div className="app">
      <main className="app-map">
        <MapView
          route={selectedRoute}
          selectedRoute={selection.selectedRoute}
          editWaypoints={editWaypoints}
          editLegs={editLegs}
          onPeakClick={selectPeak}
          onEmptyClick={clearPeak}
          onAddPoint={(point) => edit({ type: 'ADD_POINT', point })}
        />
      </main>
      {mode.name === 'edit' ? (
        <EditToolbar
          route={mode.route}
          editor={mode.editor}
          legs={editLegs}
          unsaved={unsaved}
          openedAt={mode.openedAt}
          onAction={edit}
          onLeave={leaveEditMode}
          onSaved={handleSaved}
        />
      ) : (
        <Sidebar
          routes={routes}
          selectedRoute={selectedRoute}
          selectedPeak={selection.selectedPeak}
          onSelectRoute={selectRoute}
          onClosePeak={clearPeak}
          onCreateRoute={handleCreateRoute}
          onEditRoute={handleEditRoute}
          onRouteDeleted={handleRouteDeleted}
        />
      )}
    </div>
  )
}

export default App
