import { initTracing } from './tracing'

// Starts browser telemetry. Telemetry must never break the app, so any
// failure here is swallowed and the app runs without it. Export failures
// later on are dropped quietly by the SDK.
export function initTelemetry() {
  try {
    initTracing()
  } catch {
    // Run without telemetry.
  }
}
