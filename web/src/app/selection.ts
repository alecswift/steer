import type { Peak } from '@/features/peaks/peak'

export type SelectedPeak = Peak & {
  // performance.now() timeline, for the select-to-panel latency in 1.3.
  selectedAt: number
}

// App-level selection: everything the user has picked on the map or in the
// sidebar.
export type Selection = {
  selectedPeak: SelectedPeak | null
}

export type SelectionAction =
  | { type: 'peakSelected'; peak: Peak; at: number }
  | { type: 'peakCleared' }

export const initialSelection: Selection = { selectedPeak: null }

export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'peakSelected':
      return { ...state, selectedPeak: { ...action.peak, selectedAt: action.at } }
    case 'peakCleared':
      return state.selectedPeak ? { ...state, selectedPeak: null } : state
  }
}
