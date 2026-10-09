import { describe, expect, it } from 'vitest'
import {
  canClear,
  canCloseLoop,
  canRedo,
  canUndo,
  editorReducer,
  initialEditorState,
  isDirty,
  isLoopClosed,
  type EditorAction,
  type EditorState,
  type LngLat,
} from './editor'

// Around Snoqualmie Pass.
const a: LngLat = [-121.41, 47.42]
const b: LngLat = [-121.4, 47.43]
const c: LngLat = [-121.39, 47.44]
const d: LngLat = [-121.38, 47.45]

const run = (...actions: EditorAction[]) => actions.reduce(editorReducer, initialEditorState)
const add = (point: LngLat): EditorAction => ({ type: 'ADD_POINT', point })
const undo: EditorAction = { type: 'UNDO' }
const redo: EditorAction = { type: 'REDO' }
const clear: EditorAction = { type: 'CLEAR' }
const closeLoop: EditorAction = { type: 'CLOSE_LOOP' }
const waypoints = (state: EditorState) => state.present.waypoints

describe('editorReducer', () => {
  it('starts empty with nothing to undo, redo, clear or close', () => {
    expect(waypoints(initialEditorState)).toEqual([])
    expect(canUndo(initialEditorState)).toBe(false)
    expect(canRedo(initialEditorState)).toBe(false)
    expect(canClear(initialEditorState)).toBe(false)
    expect(canCloseLoop(initialEditorState)).toBe(false)
  })

  describe('ADD_POINT', () => {
    it('appends points in order', () => {
      expect(waypoints(run(add(a), add(b), add(c)))).toEqual([a, b, c])
    })

    it('can be undone', () => {
      const state = run(add(a))
      expect(canUndo(state)).toBe(true)
      expect(state.past).toEqual([{ waypoints: [] }])
    })

    it('drops the redo stack', () => {
      const state = run(add(a), add(b), undo, add(c))
      expect(waypoints(state)).toEqual([a, c])
      expect(canRedo(state)).toBe(false)
    })

    it('does not change the state it was given', () => {
      const before = run(add(a))
      const snapshot = structuredClone(before)
      editorReducer(before, add(b))
      expect(before).toEqual(snapshot)
    })

    it('is ignored while the loop is closed', () => {
      const closed = run(add(a), add(b), add(c), closeLoop)
      expect(editorReducer(closed, add(d))).toBe(closed)
    })

    it('adds points again once undo reopens the loop', () => {
      const state = run(add(a), add(b), add(c), closeLoop, undo, add(d))
      expect(waypoints(state)).toEqual([a, b, c, d])
    })
  })

  describe('UNDO', () => {
    it('removes the last point', () => {
      expect(waypoints(run(add(a), add(b), add(c), undo))).toEqual([a, b])
    })

    it('steps back through every point to empty', () => {
      const state = run(add(a), add(b), undo, undo)
      expect(waypoints(state)).toEqual([])
      expect(canUndo(state)).toBe(false)
    })

    it('returns the same state when there is nothing to undo', () => {
      expect(editorReducer(initialEditorState, undo)).toBe(initialEditorState)
    })
  })

  describe('REDO', () => {
    it('restores an undone point', () => {
      expect(waypoints(run(add(a), add(b), undo, redo))).toEqual([a, b])
    })

    it('restores several undone steps in order', () => {
      const undone = run(add(a), add(b), add(c), undo, undo)
      expect(waypoints(undone)).toEqual([a])
      expect(waypoints(editorReducer(undone, redo))).toEqual([a, b])
      expect(waypoints(run(add(a), add(b), add(c), undo, undo, redo, redo))).toEqual([a, b, c])
    })

    it('returns the same state when there is nothing to redo', () => {
      const state = run(add(a))
      expect(editorReducer(state, redo)).toBe(state)
    })

    it('can be undone again', () => {
      expect(waypoints(run(add(a), add(b), undo, redo, undo))).toEqual([a])
    })
  })

  describe('CLEAR', () => {
    it('removes every point', () => {
      const state = run(add(a), add(b), add(c), clear)
      expect(waypoints(state)).toEqual([])
      expect(canClear(state)).toBe(false)
    })

    it('can be undone, bringing every point back', () => {
      expect(waypoints(run(add(a), add(b), add(c), clear, undo))).toEqual([a, b, c])
    })

    it('can be redone after being undone', () => {
      expect(waypoints(run(add(a), add(b), clear, undo, redo))).toEqual([])
    })

    it('clears a closed loop, and undo brings the closed loop back', () => {
      const cleared = run(add(a), add(b), add(c), closeLoop, clear)
      expect(waypoints(cleared)).toEqual([])
      expect(waypoints(editorReducer(cleared, undo))).toEqual([a, b, c, a])
    })

    it('returns the same state when there is nothing to clear', () => {
      expect(editorReducer(initialEditorState, clear)).toBe(initialEditorState)
    })

    it('lets you start a new route after clearing', () => {
      expect(waypoints(run(add(a), add(b), clear, add(c)))).toEqual([c])
    })
  })

  describe('CLOSE_LOOP', () => {
    it('appends the first point', () => {
      const state = run(add(a), add(b), add(c), closeLoop)
      expect(waypoints(state)).toEqual([a, b, c, a])
      expect(isLoopClosed(waypoints(state))).toBe(true)
    })

    it('needs at least 3 points', () => {
      const two = run(add(a), add(b))
      expect(canCloseLoop(two)).toBe(false)
      expect(editorReducer(two, closeLoop)).toBe(two)
      expect(canCloseLoop(run(add(a), add(b), add(c)))).toBe(true)
    })

    it('does nothing on an empty route', () => {
      expect(editorReducer(initialEditorState, closeLoop)).toBe(initialEditorState)
    })

    it('does nothing when the loop is already closed', () => {
      const closed = run(add(a), add(b), add(c), closeLoop)
      expect(canCloseLoop(closed)).toBe(false)
      expect(editorReducer(closed, closeLoop)).toBe(closed)
    })

    it('is reopened by undo', () => {
      const state = run(add(a), add(b), add(c), closeLoop, undo)
      expect(waypoints(state)).toEqual([a, b, c])
      expect(isLoopClosed(waypoints(state))).toBe(false)
      expect(canCloseLoop(state)).toBe(true)
    })

    it('is closed again by redo', () => {
      expect(isLoopClosed(waypoints(run(add(a), add(b), add(c), closeLoop, undo, redo)))).toBe(true)
    })
  })

  describe('isLoopClosed', () => {
    it('is false for open routes', () => {
      expect(isLoopClosed([])).toBe(false)
      expect(isLoopClosed([a, b, c])).toBe(false)
    })

    it('is false for an out-and-back that returns to the start after one point', () => {
      expect(isLoopClosed([a, b, a])).toBe(false)
    })

    it('is true when the route ends at its start', () => {
      expect(isLoopClosed([a, b, c, a])).toBe(true)
    })
  })
})

describe('isDirty', () => {
  it('is clean as opened, for a new route', () => {
    expect(isDirty(initialEditorState, [])).toBe(false)
  })

  it('is dirty once a point is added', () => {
    expect(isDirty(run(add(a)), [])).toBe(true)
  })

  it('is clean again after undoing back to where it opened', () => {
    expect(isDirty(run(add(a), add(b), undo, undo), [])).toBe(false)
  })

  it('is clean after clearing a new route, since nothing is lost', () => {
    expect(isDirty(run(add(a), add(b), clear), [])).toBe(false)
  })

  it('compares against the waypoints it opened with, e.g. a saved route (9.2)', () => {
    const opened = run(add(a), add(b))
    expect(isDirty(opened, [a, b])).toBe(false)
    expect(isDirty(editorReducer(opened, add(c)), [a, b])).toBe(true)
    expect(isDirty(run(add(a), add(c)), [a, b])).toBe(true)
    expect(isDirty(editorReducer(opened, clear), [a, b])).toBe(true)
  })

  it('compares by value, not by reference', () => {
    expect(isDirty(run(add([...a]), add([...d])), [a, d])).toBe(false)
  })
})
