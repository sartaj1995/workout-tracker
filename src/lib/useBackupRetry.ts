import { useCallback, useEffect, useRef } from 'react'
import { backUp, loadSync } from './sync'
import type { AppState } from './types'

/**
 * Keeps trying to get an owed backup into Drive.
 *
 * The first attempt happens the moment a workout is saved — which is usually
 * inside a gym, frequently with no signal. One shot at that moment is the
 * wrong design: it fails, and without this the debt sits there unnoticed until
 * someone happens to open Settings.
 *
 * So retry whenever a connection plausibly came back: the network reporting
 * itself online, the app returning to the foreground, and on load.
 */
export function useBackupRetry(state: AppState): void {
  const inFlight = useRef(false)
  // Held in a ref so the listeners below are attached once, rather than being
  // torn down and re-attached — and firing a request — on every state change.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  }, [state])

  const attempt = useCallback(async () => {
    if (inFlight.current) return
    const record = loadSync()
    // A conflict is a decision for the user, not something to retry around.
    if (!record.connected || !record.pendingSince || record.conflict) return
    if (navigator.onLine === false) return

    inFlight.current = true
    try {
      await backUp(latest.current)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    void attempt()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void attempt()
    }
    window.addEventListener('online', attempt)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', attempt)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [attempt])
}
