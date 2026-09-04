import type { ExerciseDef, Prefs, Session, WorkSet } from './types'

export const emptySet = (): WorkSet => ({ weight: null, reps: null, seconds: null, drops: [], done: false })

export const cloneSet = (s: WorkSet): WorkSet => ({
  ...s,
  drops: s.drops.map((d) => ({ ...d })),
  done: false,
})

/** Epley estimated one-rep max. For non-weighted lifts, the raw number. */
export function score(set: WorkSet, def: ExerciseDef): number {
  if (def.metric === 'time' || def.metric === 'weight_time') {
    const secs = set.seconds ?? 0
    return def.metric === 'weight_time' ? (set.weight ?? 0) * secs : secs
  }
  if (def.metric === 'reps') return set.reps ?? 0
  const w = set.weight ?? 0
  const r = set.reps ?? 0
  if (!w || !r) return 0
  return w * (1 + r / 30)
}

export function topScore(sets: WorkSet[], def: ExerciseDef): number {
  return sets.reduce((m, s) => Math.max(m, score(s, def)), 0)
}

/**
 * Total work done, including drop sets.
 *
 * A per-side exercise counts double. You write down what's in one hand, so a
 * 30kg dumbbell press is 60kg leaving the chest on every rep — and unless both
 * are counted, swapping the dumbbells for the machine in the same OR slot
 * halves the day's workload without you having worked any less.
 */
export function volume(sets: WorkSet[], def: ExerciseDef): number {
  let total = 0
  for (const s of sets) {
    if (def.metric === 'weight_reps') {
      total += (s.weight ?? 0) * (s.reps ?? 0)
      for (const d of s.drops) total += (d.weight ?? 0) * (d.reps ?? 0)
    } else if (def.metric === 'reps') {
      total += s.reps ?? 0
    } else {
      total += s.seconds ?? 0
    }
  }
  return def.perSide ? total * 2 : total
}

export function unitLabel(def: ExerciseDef): string {
  return def.unit === 'plate' ? 'plate' : 'kg'
}

export function formatSet(s: WorkSet, def: ExerciseDef): string {
  const head = (() => {
    if (def.metric === 'time') return `${s.seconds ?? '-'}s`
    if (def.metric === 'weight_time') return `${s.weight ?? '-'}x${s.seconds ?? '-'}s`
    if (def.metric === 'reps') return `${s.reps ?? '-'}`
    return `${s.weight ?? '-'}x${s.reps ?? '-'}`
  })()
  const drops = s.drops.map((d) => `${d.weight ?? '-'}x${d.reps ?? '-'}`).join('+')
  return drops ? `${head}+${drops}` : head
}

export function formatSets(sets: WorkSet[], def: ExerciseDef): string {
  return sets.map((s) => formatSet(s, def)).join('  ')
}

export function stepFor(def: ExerciseDef, prefs: Prefs): number {
  if (def.unit === 'plate') return 1
  if (def.metric === 'time') return 5
  if (def.metric === 'reps') return 1
  return prefs.weightStep
}

/**
 * If you cleared the rep ceiling last time, propose the next jump up.
 * Shown as a tappable chip, never applied behind your back.
 */
export function suggestion(prev: WorkSet | undefined, def: ExerciseDef, prefs: Prefs): string | null {
  if (!prev) return null
  const step = stepFor(def, prefs)
  if (def.metric === 'time') {
    if ((prev.seconds ?? 0) <= 0) return null
    return `${(prev.seconds ?? 0) + step}s`
  }
  if (def.metric === 'reps') {
    if ((prev.reps ?? 0) <= 0) return null
    return `${(prev.reps ?? 0) + 1}`
  }
  if ((prev.reps ?? 0) >= prefs.repCeiling && prev.weight != null) {
    return `${round(prev.weight + step)} ${unitLabel(def)}`
  }
  return null
}

/**
 * How many sessions you've logged since this exercise last set its best.
 *
 * Zero means the latest session *was* the best one. Counted from the best
 * rather than from a rolling average because that's what progressive overload
 * actually asks: sooner or later the number has to go up again.
 */
export function sessionsSinceBest(history: { top: number }[]): number {
  let best = -Infinity
  let bestAt = 0
  history.forEach((h, i) => {
    if (h.top > best) {
      best = h.top
      bestAt = i
    }
  })
  return history.length === 0 ? 0 : history.length - 1 - bestAt
}

/**
 * Sessions without a new best before it's worth saying anything.
 *
 * Low enough to catch a plateau while there's still something to do about it,
 * high enough that one ordinary week — or a session you went into tired —
 * doesn't set it off.
 */
export const STALL_AFTER = 4

export function isStalled(history: { top: number }[]): boolean {
  return history.length > STALL_AFTER && sessionsSinceBest(history) >= STALL_AFTER
}

/**
 * Somewhere lighter to restart from once a lift has stopped moving: about a
 * tenth off, rounded to a jump you can actually make on the equipment.
 *
 * Nothing is offered for rep-only exercises — there's no weight to come down
 * to, and telling someone to do fewer pull-ups isn't a plan.
 */
export function deload(def: ExerciseDef, prefs: Prefs, from: WorkSet | undefined): string | null {
  if (!from) return null
  const step = stepFor(def, prefs)
  const cut = (v: number) => Math.max(step, Math.round((v * 0.9) / step) * step)
  if (def.metric === 'time' || def.metric === 'weight_time') {
    return from.seconds ? `${cut(from.seconds)}s` : null
  }
  if (def.metric === 'reps') return null
  return from.weight ? `${round(cut(from.weight))} ${unitLabel(def)}` : null
}

export const round = (n: number): number => Math.round(n * 100) / 100

/** Plates per side for a barbell lift. Returns null if it can't be made. */
export function plateBreakdown(
  total: number,
  bar: number,
  plates: number[],
): { plate: number; count: number }[] | null {
  let perSide = (total - bar) / 2
  if (perSide < 0) return null
  const out: { plate: number; count: number }[] = []
  for (const p of [...plates].sort((a, b) => b - a)) {
    const count = Math.floor(round(perSide) / p)
    if (count > 0) {
      out.push({ plate: p, count })
      perSide = round(perSide - count * p)
    }
  }
  return round(perSide) === 0 ? out : null
}

export function sessionVolume(session: Session, defs: Record<string, ExerciseDef>): number {
  return session.entries.reduce((sum, e) => {
    const def = defs[e.exerciseId]
    if (!def || def.metric !== 'weight_reps' || def.unit !== 'kg') return sum
    return sum + volume(e.sets, def)
  }, 0)
}

/**
 * Whether any work has been put into these sets — checked off, or merely typed
 * in. Weaker than `isLogged`, and deliberately so: it guards against throwing
 * away numbers that haven't been ticked yet.
 */
export function isTouched(sets: WorkSet[]): boolean {
  return sets.some(
    (s) =>
      s.done ||
      s.weight !== null ||
      s.reps !== null ||
      s.seconds !== null ||
      s.drops.some((d) => d.weight !== null || d.reps !== null),
  )
}

export function isLogged(s: WorkSet, def: ExerciseDef): boolean {
  if (def.metric === 'time' || def.metric === 'weight_time') return (s.seconds ?? 0) > 0
  if (def.metric === 'reps') return (s.reps ?? 0) > 0
  return (s.reps ?? 0) > 0
}

export function relativeDay(ts: number, now = Date.now()): string {
  const days = Math.floor((startOfDay(now) - startOfDay(ts)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return `${Math.floor(days / 7)} weeks ago`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function plural(n: number, word: string, suffix = 's'): string {
  return `${n} ${word}${n === 1 ? '' : suffix}`
}

export function formatClock(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.abs(seconds) % 60
  return `${seconds < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`
}
