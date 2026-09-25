import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

// Injected by Vite from package.json (see vite.config.ts).
declare const __APP_VERSION__: string

// Identifies the browser app on every trace, log and metric.
export const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'steer-frontend',
  [ATTR_SERVICE_VERSION]: __APP_VERSION__,
  'deployment.environment': import.meta.env.DEV ? 'dev' : 'prod',
})

// Same-origin path that the Vite dev server proxies to the collector.
export const otlpBase = '/otlp'
