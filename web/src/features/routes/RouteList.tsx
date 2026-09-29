import { formatMiles } from '@/utils/format'
import type { RoutesResult } from './useRoutes'
import { metresToMiles } from './units'
import './RouteList.css'

type Props = {
  routes: RoutesResult
  selectedId: string | null
  // `at` is the click's DOM timestamp, on the performance.now() timeline.
  onSelect: (id: string, at: number) => void
}

/** Lists the saved routes by name and distance, marking the selected one with a stroke in the map's route colour. */
export function RouteList({ routes, selectedId, onSelect }: Props) {
  return (
    <section className="route-list" aria-labelledby="route-list-title" aria-busy={routes === null}>
      <h2 id="route-list-title" className="route-list-title">
        Saved routes
      </h2>
      {routes === null ? null : 'failed' in routes ? (
        <p className="route-list-note">Couldn’t load your routes. Check that the server is running, then reload the page.</p>
      ) : routes.routes.length === 0 ? (
        <p className="route-list-note">No routes yet. Create one to see it here.</p>
      ) : (
        <ul className="route-list-items">
          {routes.routes.map((route) => {
            const { value, unit } = formatMiles(metresToMiles(route.properties.distance_m))
            const selected = route.id === selectedId
            return (
              <li key={route.id}>
                <button
                  type="button"
                  className="route-list-row"
                  aria-current={selected || undefined}
                  onClick={(e) => onSelect(route.id, e.timeStamp)}
                >
                  <span className="route-list-swatch" aria-hidden="true" />
                  <span className="route-list-name">{route.properties.name}</span>
                  <span className="route-list-distance">
                    {value} {unit}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
