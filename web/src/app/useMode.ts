import { useCallback, useState } from 'react'
import type { Route } from '@/features/routes/api'
import {
  editorReducer,
  editorStateFor,
  initialEditorState,
  type EditorAction,
  type EditorState,
  type LngLat,
} from '@/features/routes/editor'
import { track } from '@/telemetry'

// App-level mode. In view mode you browse saved routes and peaks; in edit
// mode map clicks build a route, and the editor's history lives here, so it
// starts fresh each time edit mode opens. `route` is the saved route being
// edited, or null for a new one. `openedWith` is the route's waypoints when
// it opened, to tell whether it has unsaved changes, and `openedAt` when, on
// the performance.now() timeline, for the time to save.
export type Mode =
  | { name: 'view' }
  | { name: 'edit'; route: Route | null; editor: EditorState; openedWith: LngLat[]; openedAt: number }

const actionEvents: Record<EditorAction['type'], string> = {
  ADD_POINT: 'editor.point_added',
  UNDO: 'editor.undo',
  REDO: 'editor.redo',
  CLEAR: 'editor.cleared',
  CLOSE_LOOP: 'editor.loop_closed',
}

/**
 * The app's mode, with callbacks to open edit mode on a new route or a saved
 * one, to leave it and to apply editor actions, and the editor telemetry.
 */
export function useMode() {
  const [mode, setMode] = useState<Mode>({ name: 'view' })

  const createRoute = useCallback(() => {
    setMode({ name: 'edit', route: null, editor: initialEditorState, openedWith: [], openedAt: performance.now() })
    track('editor.opened', { mode: 'new' })
  }, [])
  // `waypoints` are the route's, as loadRoute gives them.
  const editRoute = useCallback((route: Route, waypoints: LngLat[]) => {
    setMode({ name: 'edit', route, editor: editorStateFor(waypoints), openedWith: waypoints, openedAt: performance.now() })
    track('editor.opened', { mode: 'existing' })
  }, [])
  const leaveEditMode = useCallback(() => setMode({ name: 'view' }), [])

  // Reads the current mode rather than updating it with a function, so the
  // event can report the new point count once. Each click or button press
  // renders before the next, so the mode is never stale.
  function edit(action: EditorAction) {
    if (mode.name !== 'edit') return
    const editor = editorReducer(mode.editor, action)
    // The reducer returns the same state for an action that isn't possible.
    if (editor === mode.editor) return
    setMode({ ...mode, editor })
    track(actionEvents[action.type], { point_count: editor.present.waypoints.length })
  }

  return { mode, createRoute, editRoute, leaveEditMode, edit }
}
