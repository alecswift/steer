import { describe, expect, it } from 'vitest'
import type { Peak } from '@/features/peaks/peak'
import { initialSelection, selectionReducer, type Selection } from './selection'

const kendall: Peak = { name: 'Kendall Peak', elevationFt: 5781, lon: -121.3899, lat: 47.4381 }
const guye: Peak = { name: 'Guye Peak', elevationFt: 5169, lon: -121.4153, lat: 47.4386 }

describe('selectionReducer', () => {
  it('starts with nothing selected', () => {
    expect(initialSelection.selectedPeak).toBeNull()
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

  it('leaves other selection parts alone when the peak changes', () => {
    // Stands in for selectedRouteId, which arrives in Phase 4.
    const withRoute = { ...initialSelection, selectedRouteId: 'r1' } as Selection
    const selected = selectionReducer(withRoute, { type: 'peakSelected', peak: kendall, at: 1 })
    const cleared = selectionReducer(selected, { type: 'peakCleared' })
    expect(selected).toMatchObject({ selectedRouteId: 'r1' })
    expect(cleared).toMatchObject({ selectedRouteId: 'r1' })
  })
})
