/**
 * Short cues for things a few seconds away.
 *
 * Kept apart from the rest timer on purpose. The rest alert is scheduled
 * ninety seconds out — long enough for the screen to lock and the audio
 * context to be suspended, which is exactly why it goes missing. A countdown
 * starts from a tap and finishes a few seconds later, with the page in front
 * of you and the screen held awake, so the one thing that breaks the rest
 * alert has no time to happen here. Same technique, opposite outcome.
 */
let shared: AudioContext | null = null

/** Created on first use, which is always inside a tap — iOS requires that. */
function context(): AudioContext | null {
  if (!shared) {
    try {
      shared = new AudioContext()
    } catch {
      return null
    }
  }
  void shared.resume()
  return shared
}

function tone(ctx: AudioContext, at: number, hz: number, length: number): OscillatorNode {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  // Square, for the same reason as the rest alert: the harmonics carry over
  // gym noise where a sine would disappear into it.
  osc.type = 'square'
  osc.frequency.value = hz
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.5, at + 0.01)
  gain.gain.setValueAtTime(0.5, at + length - 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0008, at + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + length + 0.02)
  return osc
}

/**
 * Race-start cues finishing `seconds` from now: a short tick on each of the
 * last three seconds, then a higher, longer tone for go — distinct enough to
 * follow with your back to the phone.
 *
 * Scheduled on the audio clock rather than fired from a JS timer, so "go"
 * lands on the exact moment counting starts instead of up to a frame late.
 * Returns a function that cancels whatever hasn't played yet.
 */
export function scheduleCountdown(seconds: number): () => void {
  const ctx = context()
  if (!ctx || seconds <= 0) return () => {}
  const now = ctx.currentTime
  const nodes: OscillatorNode[] = []
  for (const n of [3, 2, 1]) {
    if (seconds - n >= 0) nodes.push(tone(ctx, now + seconds - n, 880, 0.12))
  }
  nodes.push(tone(ctx, now + seconds, 1568, 0.4))
  return () => {
    for (const node of nodes) {
      try {
        node.stop()
      } catch {
        // Already played; nothing left to cancel.
      }
    }
  }
}
