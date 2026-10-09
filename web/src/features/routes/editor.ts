// The route editor's undo history: pure state and a reducer, with no React.
// Only the waypoints are in the history. Leg geometry lives outside it, in
// the leg cache (legCache.ts), so undo and redo never ask for a leg again.

// `[lon, lat]`, as MapLibre gives a click's position.
export type LngLat = [number, number]

export type EditorSnapshot = { waypoints: LngLat[] }

export type EditorState = {
  past: EditorSnapshot[]
  present: EditorSnapshot
  future: EditorSnapshot[]
}

export type EditorAction =
  | { type: 'ADD_POINT'; point: LngLat }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' }
  | { type: 'CLOSE_LOOP' }

export const initialEditorState: EditorState = { past: [], present: { waypoints: [] }, future: [] }

/**
 * Whether the route ends where it starts. Closing a loop appends the first
 * point, so a closed loop has at least 4 waypoints: 3 distinct points and the
 * start again.
 */
export function isLoopClosed(waypoints: LngLat[]): boolean {
  if (waypoints.length < 4) return false
  const [first, last] = [waypoints[0], waypoints[waypoints.length - 1]]
  return first[0] === last[0] && first[1] === last[1]
}

/**
 * Whether the route differs from the waypoints the editor was opened with,
 * so leaving would lose changes (FR-007). Undoing back to them makes it clean
 * again.
 */
export function isDirty(state: EditorState, openedWith: LngLat[]): boolean {
  const { waypoints } = state.present
  return (
    waypoints.length !== openedWith.length ||
    waypoints.some(([lon, lat], i) => lon !== openedWith[i][0] || lat !== openedWith[i][1])
  )
}

export const canUndo = (state: EditorState) => state.past.length > 0
export const canRedo = (state: EditorState) => state.future.length > 0
export const canClear = (state: EditorState) => state.present.waypoints.length > 0
export const canCloseLoop = (state: EditorState) =>
  state.present.waypoints.length >= 3 && !isLoopClosed(state.present.waypoints)

// Moves to a new snapshot that can be undone. A new change drops the redo stack.
function commit(state: EditorState, waypoints: LngLat[]): EditorState {
  return { past: [...state.past, state.present], present: { waypoints }, future: [] }
}

/**
 * Applies an editor action. An action that isn't possible (a click while the
 * loop is closed, undo with nothing to undo, and so on) returns the same
 * state, so callers can tell nothing changed.
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { waypoints } = state.present
  switch (action.type) {
    case 'ADD_POINT':
      // A closed loop is finished; undo reopens it.
      return isLoopClosed(waypoints) ? state : commit(state, [...waypoints, action.point])
    case 'UNDO':
      if (!canUndo(state)) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      }
    case 'REDO':
      if (!canRedo(state)) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      }
    case 'CLEAR':
      return canClear(state) ? commit(state, []) : state
    case 'CLOSE_LOOP':
      return canCloseLoop(state) ? commit(state, [...waypoints, waypoints[0]]) : state
  }
}
