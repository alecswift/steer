import { context, type Attributes } from '@opentelemetry/api'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs'
import { otlpBase, resource } from './resource'
import { sessionId } from './session'

export function initLogs() {
  const provider = new LoggerProvider({
    resource,
    processors: [
      // Also flushes when the tab is hidden or closed.
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${otlpBase}/v1/logs` }),
      }),
    ],
  })
  logs.setGlobalLoggerProvider(provider)
  return provider
}

// A proxy until initLogs() registers the real provider.
const logger = logs.getLogger('steer-frontend')

const levels = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} as const

type Level = keyof typeof levels

// Emits an OpenTelemetry log record. The active span's trace and span IDs
// are attached from the current context. `exception` becomes the
// exception.type/message/stacktrace attributes.
export function emit(
  level: Level,
  message: string,
  attrs: Attributes = {},
  exception?: unknown,
) {
  try {
    if (import.meta.env.DEV) {
      if (exception === undefined) console[level](message, attrs)
      else console[level](message, attrs, exception)
    }
    logger.emit({
      severityNumber: levels[level],
      severityText: level.toUpperCase(),
      body: message,
      attributes: { ...attrs, 'session.id': sessionId },
      exception,
      context: context.active(),
    })
  } catch {
    // Telemetry must never break the app.
  }
}

export const log = {
  debug: (message: string, attrs?: Attributes) => emit('debug', message, attrs),
  info: (message: string, attrs?: Attributes) => emit('info', message, attrs),
  warn: (message: string, attrs?: Attributes) => emit('warn', message, attrs),
  error: (message: string, attrs?: Attributes, exception?: unknown) =>
    emit('error', message, attrs, exception),
}
