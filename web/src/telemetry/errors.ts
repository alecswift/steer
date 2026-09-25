import { log } from './logs'

// Logs errors that nothing else caught, with their stack traces.
export function installErrorHandlers() {
  window.addEventListener('error', (event) => {
    log.error(
      event.message || 'Uncaught error',
      { 'error.source': 'window.error' },
      event.error ?? event.message,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason
    log.error(
      reason instanceof Error ? reason.message : 'Unhandled promise rejection',
      { 'error.source': 'unhandledrejection' },
      reason,
    )
  })
}
