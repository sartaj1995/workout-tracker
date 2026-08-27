import { useEffect, useRef } from 'react'

/**
 * Holds the screen awake while a workout is running.
 *
 * A locked screen is why the rest alert gets missed: the page is frozen, its
 * timers stop, and on iOS the audio context is suspended outright. Keeping the
 * screen on removes the cause rather than working around it — and stops you
 * unlocking the phone between every set.
 *
 * The lock is released by the browser whenever the page is hidden, so it has
 * to be re-taken on the way back.
 */
export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinel.current) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel.current = lock
        lock.addEventListener('release', () => {
          sentinel.current = null
        })
      } catch {
        // Denied, unsupported, or the tab lost focus mid-request. The workout
        // is unaffected; the screen just sleeps as normal.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      const held = sentinel.current
      sentinel.current = null
      if (held) void held.release()
    }
  }, [active])
}
