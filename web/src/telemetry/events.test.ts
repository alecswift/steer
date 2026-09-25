import { metrics as otelMetrics } from '@opentelemetry/api'
import { logs } from '@opentelemetry/api-logs'
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs'
import { MeterProvider, MetricReader } from '@opentelemetry/sdk-metrics'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { track } from './events'
import { sessionId } from './session'

// Collects metrics on demand instead of on a timer.
class TestReader extends MetricReader {
  protected onForceFlush() {
    return Promise.resolve()
  }
  protected onShutdown() {
    return Promise.resolve()
  }
}

const exporter = new InMemoryLogRecordExporter()
const reader = new TestReader()

beforeAll(() => {
  logs.setGlobalLoggerProvider(
    new LoggerProvider({
      processors: [new SimpleLogRecordProcessor({ exporter })],
    }),
  )
  otelMetrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }))
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterAll(() => {
  logs.disable()
  otelMetrics.disable()
  vi.restoreAllMocks()
})

describe('track', () => {
  it('emits a log record named by event.name, with its attributes', () => {
    track('peak.selected', { peak_name: 'Kendall Peak' })

    const [record] = exporter.getFinishedLogRecords()
    expect(record.body).toBe('peak.selected')
    expect(record.severityText).toBe('INFO')
    expect(record.attributes).toEqual({
      'event.name': 'peak.selected',
      peak_name: 'Kendall Peak',
      'session.id': sessionId,
    })
  })

  it('counts events by name in steer.events', async () => {
    track('route.saved')
    track('route.saved')

    const { resourceMetrics } = await reader.collect()
    const metric = resourceMetrics.scopeMetrics
      .flatMap((s) => s.metrics)
      .find((m) => m.descriptor.name === 'steer.events')
    const counts = Object.fromEntries(
      metric!.dataPoints.map((p) => [p.attributes['event.name'], p.value]),
    )
    expect(counts).toEqual({ 'peak.selected': 1, 'route.saved': 2 })
  })
})
