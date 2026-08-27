import { useCallback, useEffect, useRef, useState } from 'react'
import type { Prefs } from './types'

/**
 * The end-of-rest alert.
 *
 * Square rather than sine: the harmonics carry over gym noise, and a phone
 * speaker is loudest around 1–2kHz, which is also where hearing is sharpest.
 * Four alternating tones, because one short blip is easy to miss mid-set.
 */
function scheduleAlert(ctx: AudioContext, at: number): () => void {
  const nodes: OscillatorNode[] = []
  const pattern = [
    { offset: 0, hz: 1046 },
    { offset: 0.26, hz: 1568 },
    { offset: 0.52, hz: 1046 },
    { offset: 0.78, hz: 1568 },
  ]

  for (const { offset, hz } of pattern) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = hz

    const start = at + offset
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.55, start + 0.012)
    gain.gain.setValueAtTime(0.55, start + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.22)

    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.24)
    nodes.push(osc)
  }

  return () => {
    for (const node of nodes) {
      try {
        node.stop()
      } catch {
        // Already finished; nothing to cancel.
      }
    }
  }
}

export interface RestTimer {
  /** Seconds left. Negative once it has run over. */
  remaining: number
  total: number
  running: boolean
  start: (seconds?: number) => void
  extend: (seconds: number) => void
  stop: () => void
  /** Plays the alert immediately, so it can be checked before the gym. */
  preview: () => void
}

export function useRestTimer(prefs: Prefs): RestTimer {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [total, setTotal] = useState(prefs.restSeconds)
  const [, tick] = useState(0)
  const audio = useRef<AudioContext | null>(null)
  const cancelAlert = useRef<(() => void) | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (endAt === null) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [endAt])

  const remaining = endAt === null ? 0 : Math.round((endAt - Date.now()) / 1000)

  /** Created inside a tap handler so iOS permits sound from it later. */
  const context = useCallback((): AudioContext | null => {
    if (!audio.current) {
      try {
        audio.current = new AudioContext()
      } catch {
        audio.current = null
      }
    }
    void audio.current?.resume()
    return audio.current
  }, [])

  /**
   * Hand the alert to the audio clock the moment rest starts, rather than
   * playing it when a JS timer notices zero. Background tabs get their timers
   * throttled to the point of not firing at all, which is exactly when you're
   * least likely to be watching the screen.
   */
  const arm = useCallback(
    (seconds: number) => {
      cancelAlert.current?.()
      cancelAlert.current = null
      if (!prefs.soundOn || seconds <= 0) return
      const ctx = context()
      if (!ctx) return
      try {
        cancelAlert.current = scheduleAlert(ctx, ctx.currentTime + seconds)
      } catch {
        cancelAlert.current = null
      }
    },
    [context, prefs.soundOn],
  )

  // Vibration can't be scheduled ahead, so it stays on the JS timer. It fires
  // late rather than never if the page was throttled.
  useEffect(() => {
    if (endAt === null || fired.current || remaining > 0) return
    fired.current = true
    if (prefs.vibrateOn) navigator.vibrate?.([300, 120, 300, 120, 300])
  }, [remaining, endAt, prefs.vibrateOn])

  const start = useCallback(
    (seconds?: number) => {
      const secs = seconds ?? prefs.restSeconds
      fired.current = false
      arm(secs)
      setTotal(secs)
      setEndAt(Date.now() + secs * 1000)
    },
    [arm, prefs.restSeconds],
  )

  /** Positive adds rest, negative takes it away. Never runs past zero. */
  const extend = useCallback(
    (seconds: number) => {
      if (endAt === null) return
      const next = Math.max(Date.now(), endAt + seconds * 1000)
      const left = Math.round((next - Date.now()) / 1000)
      if (seconds > 0) {
        // More rest means a fresh alert is due when it runs out.
        fired.current = false
        arm(left)
      } else if (next <= Date.now()) {
        // Cutting rest short to zero shouldn't sound — you're looking at it.
        fired.current = true
        cancelAlert.current?.()
        cancelAlert.current = null
      } else {
        arm(left)
      }
      setEndAt(next)
      setTotal((t) => Math.max(1, t + seconds))
    },
    [arm, endAt],
  )

  const stop = useCallback(() => {
    cancelAlert.current?.()
    cancelAlert.current = null
    setEndAt(null)
  }, [])

  const preview = useCallback(() => {
    const ctx = context()
    if (!ctx) return
    try {
      scheduleAlert(ctx, ctx.currentTime + 0.05)
    } catch {
      // Nothing to do; the toggle still reflects the preference.
    }
    if (prefs.vibrateOn) navigator.vibrate?.([300, 120, 300, 120, 300])
  }, [context, prefs.vibrateOn])

  return { remaining, total, running: endAt !== null, start, extend, stop, preview }
}
