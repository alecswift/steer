import type { Attributes } from '@opentelemetry/api'
import { emit } from './logs'
import { metrics } from './metrics'

const eventCount = metrics.counter('steer.events', {
  description: 'Product events, labelled by event name',
})

// Records a product event: a log record carrying `event.name` (lowercase
// `area.action`, e.g. `route.saved`), plus a count by name in Prometheus
// (`steer_events_total`).
export function track(name: string, attrs: Attributes = {}) {
  emit('info', name, { ...attrs, 'event.name': name })
  eventCount.add(1, { 'event.name': name })
}
