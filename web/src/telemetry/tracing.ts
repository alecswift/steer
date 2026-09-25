import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web'
import { otlpBase, resource } from './resource'

export function initTracing() {
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${otlpBase}/v1/traces` }),
      ),
    ],
  })
  provider.register()

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      // Same-origin calls (e.g. /api) get a traceparent header by default.
      // The exporters' own requests are ignored so they don't trace themselves.
      new FetchInstrumentation({ ignoreUrls: [new RegExp(`${otlpBase}/`)] }),
    ],
  })

  return provider
}
