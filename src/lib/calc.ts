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

/** Total work done, including drop sets. */
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
  return total
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
