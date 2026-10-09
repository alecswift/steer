import { useEffect } from 'react'
import { flushTelemetry, track } from '@/telemetry'

/**
 * Asks the browser to warn before a refresh or tab close loses unsaved
 * changes (FR-007). The handler is registered only while `unsaved` is true,
 * so a clean editor, or view mode, leaves the page without a prompt.
 */
export function useUnsavedChangesWarning(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Older browsers show the prompt only when this is set.
      event.returnValue = ''
      track('editor.discard_prompted', { trigger: 'beforeunload' })
    }
    // The page is going away with the changes still unsaved, so the hiker
    // chose to leave. Flushed now, since the page may not get another chance.
    // A page kept in the back/forward cache comes back with them intact.
    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return
      track('editor.discarded', { trigger: 'beforeunload' })
      flushTelemetry()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [unsaved])
}
