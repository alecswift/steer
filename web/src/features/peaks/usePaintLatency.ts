import { useEffect, useEffectEvent } from 'react'

/**
 * Calls `report` with the milliseconds from `startedAt` until the screen has
 * painted, once for each new `startedAt`.
 *
 * `startedAt` is on the performance.now() timeline, e.g. a DOM event's
 * `timeStamp`. requestAnimationFrame runs just before paint and the timeout
 * right after it. Cleanup cancels a pending measurement, so StrictMode's
 * second effect run doesn't report twice.
 */
export function usePaintLatency(startedAt: number, report: (ms: number) => void) {
  const onPainted = useEffectEvent(report)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => onPainted(Math.round(performance.now() - startedAt)))
    })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
    }
  }, [startedAt])
}
