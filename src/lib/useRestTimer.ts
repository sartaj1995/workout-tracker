import { useCallback, useEffect, useRef, useState } from 'react'
import type { Prefs } from './types'

/** Short double beep, built on the fly so there's no audio file to ship. */
function beep(ctx: AudioContext) {
  const at = ctx.currentTime
  for (const offset of [0, 0.22]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, at + offset)
    gain.gain.exponentialRampToValueAtTime(0.35, at + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at + offset)
    osc.stop(at + offset + 0.2)
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
}

export function useRestTimer(prefs: Prefs): RestTimer {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [total, setTotal] = useState(prefs.restSeconds)
  const [, tick] = useState(0)
  const audio = useRef<AudioContext | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (endAt === null) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [endAt])

  const remaining = endAt === null ? 0 : Math.round((endAt - Date.now()) / 1000)

  useEffect(() => {
    if (endAt === null || fired.current || remaining > 0) return
    fired.current = true
    if (prefs.vibrateOn) navigator.vibrate?.([200, 90, 200])
    if (prefs.soundOn && audio.current) {
      try {
        beep(audio.current)
      } catch {
        // Audio can be blocked; the vibration still fires.
      }
    }
  }, [remaining, endAt, prefs.soundOn, prefs.vibrateOn])

  const start = useCallback(
    (seconds?: number) => {
      const secs = seconds ?? prefs.restSeconds
      // Created inside a tap handler so iOS lets it make sound later.
      if (!audio.current && prefs.soundOn) {
        try {
          audio.current = new AudioContext()
        } catch {
          audio.current = null
        }
      }
      void audio.current?.resume()
      fired.current = false
      setTotal(secs)
      setEndAt(Date.now() + secs * 1000)
    },
    [prefs.restSeconds, prefs.soundOn],
  )

  const extend = useCallback((seconds: number) => {
    fired.current = false
    setTotal((t) => t + seconds)
    setEndAt((e) => (e === null ? null : e + seconds * 1000))
  }, [])

  const stop = useCallback(() => setEndAt(null), [])

  return { remaining, total, running: endAt !== null, start, extend, stop }
}
