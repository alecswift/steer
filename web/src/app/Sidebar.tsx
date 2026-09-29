import { PeakMark } from '@/components/icons'
import { PeakPanel } from '@/features/peaks/PeakPanel'
import type { Route } from '@/features/routes/api'
import { RouteList } from '@/features/routes/RouteList'
import { RoutePanel } from '@/features/routes/RoutePanel'
import type { RoutesResult } from '@/features/routes/useRoutes'
import type { SelectedPeak } from './selection'
import './Sidebar.css'

type Props = {
  routes: RoutesResult
  selectedRoute: Route | null
  selectedPeak: SelectedPeak | null
  onSelectRoute: (id: string, at: number) => void
  onClosePeak: () => void
}

/**
 * Lists the saved routes above the details of what's selected: the peak if
 * one is selected, otherwise the selected route, otherwise a prompt.
 */
export function Sidebar({ routes, selectedRoute, selectedPeak, onSelectRoute, onClosePeak }: Props) {
  const hasRoutes = routes !== null && 'routes' in routes && routes.routes.length > 0

  return (
    <aside className="sidebar" aria-label="Details">
      <RouteList routes={routes} selectedId={selectedRoute?.id ?? null} onSelect={onSelectRoute} />
      <div className="sidebar-details" aria-live="polite">
        {selectedPeak ? (
          <PeakPanel peak={selectedPeak} selectedAt={selectedPeak.selectedAt} onClose={onClosePeak} />
        ) : selectedRoute ? (
          <RoutePanel route={selectedRoute} />
        ) : (
          <p className="sidebar-empty">
            <PeakMark className="sidebar-empty-mark" />
            {hasRoutes
              ? 'Select a route, or click a peak on the map to see its details.'
              : 'Click a peak on the map to see its details.'}
          </p>
        )}
      </div>
    </aside>
  )
}
