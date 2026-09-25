import { installErrorHandlers } from './errors'
import { initLogs } from './logs'
import { initTracing } from './tracing'

export { ErrorBoundary } from './ErrorBoundary'
export { log } from './logs'

// Starts browser telemetry. Telemetry must never break the app, so a
// failing part is skipped and the rest still starts. Export failures later
// on are dropped quietly by the SDK.
export function initTelemetry() {
  for (const init of [initTracing, initLogs, installErrorHandlers]) {
    try {
      init()
    } catch {
      // Run without this part of telemetry.
    }
  }
}
