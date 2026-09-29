import type { Peak } from '@/features/peaks/peak'

export type SelectedPeak = Peak & {
  // performance.now() timeline, for the select-to-panel latency in 1.3.
  selectedAt: number
}

export type SelectedRoute = {
  id: string
  // performance.now() timeline, for the select-to-fit latency in 4.3.
  selectedAt: number
}

// App-level selection: everything the user has picked on the map or in the
// sidebar. A peak and a route can both be selected: the route stays drawn
// while the peak's panel is shown.
export type Selection = {
  selectedPeak: SelectedPeak | null
  selectedRoute: SelectedRoute | null
}

export type SelectionAction =
  | { type: 'peakSelected'; peak: Peak; at: number }
  | { type: 'peakCleared' }
  | { type: 'routeSelected'; id: string; at: number }

export const initialSelection: Selection = { selectedPeak: null, selectedRoute: null }

/**
 * Selects a peak or a route with its click timestamp, or clears the current peak.
 * Selecting a route also clears the peak, so the sidebar shows the route just chosen.
 * Returns the same state when clearing an empty peak selection.
 */
export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'peakSelected':
      return { ...state, selectedPeak: { ...action.peak, selectedAt: action.at } }
    case 'peakCleared':
      return state.selectedPeak ? { ...state, selectedPeak: null } : state
    case 'routeSelected':
      return { ...state, selectedPeak: null, selectedRoute: { id: action.id, selectedAt: action.at } }
  }
}
