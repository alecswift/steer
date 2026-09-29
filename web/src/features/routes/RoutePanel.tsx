import { formatFeet, formatMiles } from '@/utils/format'
import type { Route } from './api'
import { metresToFeet, metresToMiles } from './units'
import './RoutePanel.css'

type Props = { route: Route }

// A figure with its unit set small and muted.
function Measure({ value, unit }: { value: string; unit: string }) {
  return (
    <>
      <span className="route-panel-value">{value}</span> <span className="route-panel-unit">{unit}</span>
    </>
  )
}

/** Shows the selected route's name, its distance as the panel's large figure, and its elevation range and gain/loss. */
export function RoutePanel({ route }: Props) {
  const { name, distance_m, gain_m, loss_m, min_ele_m, max_ele_m } = route.properties
  const feet = (metres: number) => formatFeet(metresToFeet(metres))

  return (
    <section className="route-panel" aria-labelledby="route-panel-title">
      <h2 id="route-panel-title" className="route-panel-title">
        {name}
      </h2>
      <p className="route-panel-distance">
        <Measure {...formatMiles(metresToMiles(distance_m))} />
      </p>
      <dl className="route-panel-stats">
        <div>
          <dt>Gain</dt>
          <dd>
            <Measure {...feet(gain_m)} />
          </dd>
        </div>
        <div>
          <dt>Loss</dt>
          <dd>
            <Measure {...feet(loss_m)} />
          </dd>
        </div>
        <div>
          <dt>Lowest</dt>
          <dd>
            <Measure {...feet(min_ele_m)} />
          </dd>
        </div>
        <div>
          <dt>Highest</dt>
          <dd>
            <Measure {...feet(max_ele_m)} />
          </dd>
        </div>
      </dl>
    </section>
  )
}
