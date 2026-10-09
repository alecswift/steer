import { installErrorHandlers } from './errors'
import { initLogs } from './logs'
import { initMetrics } from './metrics'
import { initTracing } from './tracing'

export { ErrorBoundary } from './ErrorBoundary'
export { track } from './events'
export { log } from './logs'
export { metrics } from './metrics'

type Flushable = { forceFlush(): Promise<void> }

// The providers that started, to flush on demand.
const flushable: Flushable[] = []

// Starts browser telemetry. Telemetry must never break the app, so a
// failing part is skipped and the rest still starts. Export failures later
// on are dropped quietly by the SDK.
export function initTelemetry() {
  const inits: (() => Flushable | void)[] = [initTracing, initLogs, initMetrics, installErrorHandlers]
  for (const init of inits) {
    try {
      const provider = init()
      if (provider) flushable.push(provider)
    } catch {
      // Run without this part of telemetry.
    }
  }
}

// Sends buffered traces, logs and metrics now, e.g. on `pagehide`. The log processor
// flushes on its own when the tab is hidden, but its `pagehide` fallback
// listens on `document`, which `pagehide` never reaches, so a record emitted
// while the page unloads would otherwise be lost.
export function flushTelemetry() {
  for (const provider of flushable) {
    try {
      provider.forceFlush().catch(() => {})
    } catch {
      // Telemetry must never break the app.
    }
  }
}
