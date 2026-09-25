import { context, trace } from '@opentelemetry/api'
import { logs } from '@opentelemetry/api-logs'
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs'
import { StackContextManager } from '@opentelemetry/sdk-trace-web'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { log } from './logs'
import { sessionId } from './session'

const exporter = new InMemoryLogRecordExporter()

beforeAll(() => {
  context.setGlobalContextManager(new StackContextManager().enable())
  logs.setGlobalLoggerProvider(
    new LoggerProvider({
      processors: [new SimpleLogRecordProcessor({ exporter })],
    }),
  )
  // Keep test output quiet; the wrapper also prints in dev.
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

beforeEach(() => exporter.reset())

afterAll(() => {
  logs.disable()
  context.disable()
  vi.restoreAllMocks()
})

describe('log', () => {
  it('emits a record with the message, level, attributes and session ID', () => {
    log.info('map ready', { zoom: 11 })

    const [record] = exporter.getFinishedLogRecords()
    expect(record.body).toBe('map ready')
    expect(record.severityText).toBe('INFO')
    expect(record.attributes).toEqual({ zoom: 11, 'session.id': sessionId })
  })

  it('carries the active trace and span IDs', () => {
    const spanContext = {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: 1,
    }
    const active = trace.setSpanContext(context.active(), spanContext)

    context.with(active, () => log.warn('slow tile'))

    const [record] = exporter.getFinishedLogRecords()
    expect(record.spanContext?.traceId).toBe(spanContext.traceId)
    expect(record.spanContext?.spanId).toBe(spanContext.spanId)
  })

  it('records an exception with its stack trace', () => {
    const error = new Error('boom')

    log.error('render failed', { 'error.source': 'react' }, error)

    const [record] = exporter.getFinishedLogRecords()
    expect(record.severityText).toBe('ERROR')
    expect(record.attributes).toMatchObject({
      'error.source': 'react',
      'exception.type': 'Error',
      'exception.message': 'boom',
      'exception.stacktrace': error.stack,
    })
  })
})
