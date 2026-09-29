import { describe, expect, it } from 'vitest'
import type { Peak } from '@/features/peaks/peak'
import { initialSelection, selectionReducer } from './selection'

const kendall: Peak = { name: 'Kendall Peak', elevationFt: 5781, lon: -121.3899, lat: 47.4381 }
const guye: Peak = { name: 'Guye Peak', elevationFt: 5169, lon: -121.4153, lat: 47.4386 }

describe('selectionReducer', () => {
  it('starts with nothing selected', () => {
    expect(initialSelection.selectedPeak).toBeNull()
    expect(initialSelection.selectedRoute).toBeNull()
  })

  it('selects a peak and records when it was selected', () => {
    const state = selectionReducer(initialSelection, { type: 'peakSelected', peak: kendall, at: 1234.5 })
    expect(state.selectedPeak).toEqual({ ...kendall, selectedAt: 1234.5 })
  })

  it('replaces the selected peak with a newly clicked one', () => {
    let state = selectionReducer(initialSelection, { type: 'peakSelected', peak: kendall, at: 1 })
    state = selectionReducer(state, { type: 'peakSelected', peak: guye, at: 2 })
    expect(state.selectedPeak).toEqual({ ...guye, selectedAt: 2 })
  })

  it('clears the selected peak', () => {
    const selected = selectionReducer(initialSelection, { type: 'peakSelected', peak: kendall, at: 1 })
    expect(selectionReducer(selected, { type: 'peakCleared' }).selectedPeak).toBeNull()
  })

  it('returns the same state when clearing with no peak selected', () => {
    expect(selectionReducer(initialSelection, { type: 'peakCleared' })).toBe(initialSelection)
  })

  it('selects a route and records when it was selected', () => {
    const state = selectionReducer(initialSelection, { type: 'routeSelected', id: 'r1', at: 42 })
    expect(state.selectedRoute).toEqual({ id: 'r1', selectedAt: 42 })
  })

  it('switches to another route', () => {
    let state = selectionReducer(initialSelection, { type: 'routeSelected', id: 'r1', at: 1 })
    state = selectionReducer(state, { type: 'routeSelected', id: 'r2', at: 2 })
    expect(state.selectedRoute).toEqual({ id: 'r2', selectedAt: 2 })
  })

  it('records a new time when the same route is selected again, so it is framed again', () => {
    let state = selectionReducer(initialSelection, { type: 'routeSelected', id: 'r1', at: 1 })
    state = selectionReducer(state, { type: 'routeSelected', id: 'r1', at: 5 })
    expect(state.selectedRoute).toEqual({ id: 'r1', selectedAt: 5 })
  })

  it('keeps the route selected while a peak is selected and cleared', () => {
    const withRoute = selectionReducer(initialSelection, { type: 'routeSelected', id: 'r1', at: 1 })
    const withPeak = selectionReducer(withRoute, { type: 'peakSelected', peak: kendall, at: 2 })
    const cleared = selectionReducer(withPeak, { type: 'peakCleared' })
    expect(withPeak.selectedRoute).toEqual({ id: 'r1', selectedAt: 1 })
    expect(cleared).toEqual(withRoute)
  })

  it('clears the selected peak when a route is selected', () => {
    const withPeak = selectionReducer(initialSelection, { type: 'peakSelected', peak: kendall, at: 1 })
    const state = selectionReducer(withPeak, { type: 'routeSelected', id: 'r1', at: 2 })
    expect(state.selectedPeak).toBeNull()
    expect(state.selectedRoute).toEqual({ id: 'r1', selectedAt: 2 })
  })
})
