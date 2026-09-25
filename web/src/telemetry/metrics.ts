import {
  metrics as otelMetrics,
  type Attributes,
  type Counter,
  type Histogram,
  type MetricOptions,
} from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics'
import { otlpBase, resource } from './resource'

export function initMetrics() {
  const provider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${otlpBase}/v1/metrics` }),
        exportIntervalMillis: 10_000,
      }),
    ],
  })
  otelMetrics.setGlobalMeterProvider(provider)

  // Export right away when the tab is hidden or closed, so short visits
  // still report.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      provider.forceFlush().catch(() => {})
    }
  })
  return provider
}

// The metrics API has no proxy provider, so instruments are created on
// first use (after initMetrics) rather than when a module is imported.
const instruments = new Map<string, Counter | Histogram>()

function instrument<T extends Counter | Histogram>(
  name: string,
  create: (meter: ReturnType<typeof otelMetrics.getMeter>) => T,
): T {
  let found = instruments.get(name)
  if (!found) {
    found = create(otelMetrics.getMeter('steer-frontend'))
    instruments.set(name, found)
  }
  return found as T
}

// Names follow the conventions in PLAN.md: a `steer.` prefix and the unit in
// the name (e.g. `steer.snap.duration_ms`). No `unit` option is set, so
// Prometheus keeps the name as written.
export const metrics = {
  histogram(name: string, options?: MetricOptions) {
    return {
      record(value: number, attrs?: Attributes) {
        try {
          instrument(name, (m) => m.createHistogram(name, options)).record(value, attrs)
        } catch {
          // Telemetry must never break the app.
        }
      },
    }
  },

  counter(name: string, options?: MetricOptions) {
    return {
      add(value = 1, attrs?: Attributes) {
        try {
          instrument(name, (m) => m.createCounter(name, options)).add(value, attrs)
        } catch {
          // Telemetry must never break the app.
        }
      },
    }
  },
}
