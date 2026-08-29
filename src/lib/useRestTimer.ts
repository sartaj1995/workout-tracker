import { useCallback, useEffect, useRef, useState } from 'react'
import type { Prefs } from './types'

/**
 * The end-of-rest alert.
 *
 * Square rather than sine: the harmonics carry over gym noise, and a phone
 * speaker is loudest around 1–2kHz, which is also where hearing is sharpest.
 * Four alternating tones, because one short blip is easy to miss mid-set.
 *
 * `onPlayed` reports that the tones actually sounded. A context suspended at
 * the scheduled moment plays nothing and never ends, so a missed alert can be
 * noticed rather than assumed to have happened.
 */
function scheduleAlert(ctx: AudioContext, at: number, onPlayed?: () => void): () => void {
  const nodes: OscillatorNode[] = []
  let cancelled = false
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

  // The last tone running out is the alert having been heard — unless we cut
  // it short ourselves, which ends it the same way but means the opposite.
  const last = nodes[nodes.length - 1]
  if (last) {
    last.onended = () => {
      if (!cancelled) onPlayed?.()
    }
  }

  return () => {
    cancelled = true
    for (const node of nodes) {
      try {
        node.stop()
      } catch {
        // Already finished; nothing to cancel.
      }
    }
  }
}

/**
 * A trickle of near-silence, running for as long as a rest does.
 *
 * This is the missing beep. An audio context with nothing playing is suspended
 * once the page goes to the background — a locked screen, a glance at
 * something else — and a suspended context's clock stops with it. The alert
 * sitting on that clock never comes due, and if the page comes back it comes
 * due late by however long the phone was away, which is the beep arriving
 * eight seconds after it was wanted.
 *
 * Something playing, however quietly, keeps the context running and the alert
 * on time. Only for the length of a rest, and mixed in alongside whatever else
 * is playing rather than taking over from it.
 */
function keepAwake(ctx: AudioContext): () => void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  // Below what a phone speaker can reproduce, and far too quiet to hear even
  // if it weren't. Not silent outright: a zero gain is exactly the sort of
  // thing a browser may optimise away, taking the point of this with it.
  osc.frequency.value = 30
  gain.gain.value = 0.0001
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  return () => {
    try {
      osc.stop()
    } catch {
      // Already stopped.
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
  const stopKeepAwake = useRef<(() => void) | null>(null)
  /** The tones have sounded. Reported by the tones themselves, not assumed. */
  const heard = useRef(false)
  const buzzed = useRef(false)
  // Both clocks as they read when the alert was scheduled. The difference
  // between how far each has moved since is time the audio clock spent
  // suspended — which is time the alert failed to count down.
  const armedWall = useRef(0)
  const armedAudio = useRef(0)

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

  /** Hand the tones to the audio clock, and note the moment by both clocks. */
  const schedule = useCallback((ctx: AudioContext, seconds: number) => {
    cancelAlert.current?.()
    cancelAlert.current = null
    armedWall.current = Date.now()
    armedAudio.current = ctx.currentTime
    try {
      cancelAlert.current = scheduleAlert(ctx, ctx.currentTime + seconds, () => {
        heard.current = true
      })
    } catch {
      cancelAlert.current = null
    }
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
      heard.current = false
      if (!prefs.soundOn || seconds <= 0) return
      const ctx = context()
      if (!ctx) return
      schedule(ctx, seconds)
      if (!stopKeepAwake.current) {
        try {
          stopKeepAwake.current = keepAwake(ctx)
        } catch {
          stopKeepAwake.current = null
        }
      }
    },
    [context, prefs.soundOn, schedule],
  )

  /**
   * Bring the alert back in line after the page has been away.
   *
   * The near-silence above is the fix; this is the net under it, for the
   * phones and situations where it doesn't hold. Whatever the audio clock
   * failed to advance while we weren't looking is time the alert didn't count
   * down, so re-schedule it against the wall clock instead — and if rest is
   * already over by then, sound it now. Late is worse than on time, and much
   * better than never.
   */
  useEffect(() => {
    if (endAt === null) return

    const catchUp = () => {
      if (document.visibilityState !== 'visible') return
      const ctx = audio.current
      if (!ctx || !prefs.soundOn || heard.current || !cancelAlert.current) return
      const slept = (Date.now() - armedWall.current) / 1000 - (ctx.currentTime - armedAudio.current)
      // The clocks still agree: nothing was suspended, and what's scheduled is
      // still pointing at the right moment.
      if (slept < 0.25) return
      void ctx
        .resume()
        .then(() => schedule(ctx, Math.max((endAt - Date.now()) / 1000, 0.05)))
        .catch(() => {
          // Nothing more to try; the vibration below still lands.
        })
    }

    document.addEventListener('visibilitychange', catchUp)
    return () => document.removeEventListener('visibilitychange', catchUp)
  }, [endAt, prefs.soundOn, schedule])

  // Vibration can't be scheduled ahead, so it stays on the JS timer. It fires
  // late rather than never if the page was throttled.
  useEffect(() => {
    if (endAt === null || remaining > 0) return
    if (!buzzed.current) {
      buzzed.current = true
      if (prefs.vibrateOn) navigator.vibrate?.([300, 120, 300, 120, 300])
    }
    // Rest is over and the tones are out. Nothing is waiting on the audio
    // clock any more, so stop paying to keep it running.
    if (heard.current || !prefs.soundOn) {
      stopKeepAwake.current?.()
      stopKeepAwake.current = null
    }
  }, [remaining, endAt, prefs.vibrateOn, prefs.soundOn])

  // Leaving nothing running if the app goes away mid-rest.
  useEffect(
    () => () => {
      cancelAlert.current?.()
      stopKeepAwake.current?.()
    },
    [],
  )

  const start = useCallback(
    (seconds?: number) => {
      const secs = seconds ?? prefs.restSeconds
      buzzed.current = false
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
        buzzed.current = false
        arm(left)
      } else if (next <= Date.now()) {
        // Cutting rest short to zero shouldn't sound — you're looking at it.
        buzzed.current = true
        heard.current = true
        cancelAlert.current?.()
        cancelAlert.current = null
        stopKeepAwake.current?.()
        stopKeepAwake.current = null
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
    stopKeepAwake.current?.()
    stopKeepAwake.current = null
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
