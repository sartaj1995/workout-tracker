import type { DayId, ExerciseDef, Metric, Unit, WorkSet } from '../lib/types'
import { OVERRIDES, RAW_NOTES } from './notes'

export const DAYS: { id: DayId; label: string }[] = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'upper', label: 'Upper' },
]

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const num = (s: string | undefined): number | null => {
  if (s === undefined || s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "70x8+55x3+45x3" -> one set with two drops. "38" -> a bare number. */
function parseToken(token: string, metric: Metric): WorkSet | null {
  const parts = token.split('+').filter(Boolean)
  if (parts.length === 0) return null

  const readPair = (p: string): { a: number | null; b: number | null } => {
    const paired = /^(\d+(?:\.\d+)?)?x(\d+(?:\.\d+)?)?$/.exec(p)
    if (paired) return { a: num(paired[1]), b: num(paired[2]) }
    const bare = /^(\d+(?:\.\d+)?)s?$/.exec(p)
    if (bare) return { a: null, b: num(bare[1]) }
    return { a: null, b: null }
  }

  const toSet = (p: string): WorkSet => {
    const { a, b } = readPair(p)
    if (metric === 'time') return { weight: null, reps: null, seconds: b, drops: [], done: false }
    if (metric === 'weight_time') return { weight: a, reps: null, seconds: b, drops: [], done: false }
    if (metric === 'reps') return { weight: null, reps: b, seconds: null, drops: [], done: false }
    return { weight: a, reps: b, seconds: null, drops: [], done: false }
  }

  const head = toSet(parts[0])
  head.drops = parts.slice(1).map((p) => {
    const s = toSet(p)
    return { weight: s.weight, reps: s.reps }
  })
  return head
}

export interface ParsedNotes {
  defs: ExerciseDef[]
  seeds: Record<string, WorkSet[]>
}

export function parseNotes(raw: string = RAW_NOTES): ParsedNotes {
  const defs: ExerciseDef[] = []
  const seeds: Record<string, WorkSet[]> = {}

  let day: DayId | null = null
  let optional = false
  let sawBlank = false
  let pendingOr = false
  let choiceCounter = 0

  for (const line of raw.split('\n')) {
    const text = line.trim()

    if (text === '') {
      sawBlank = true
      continue
    }

    const heading = DAYS.find((d) => d.label.toLowerCase() === text.toLowerCase())
    if (heading) {
      day = heading.id
      optional = false
      sawBlank = false
      pendingOr = false
      continue
    }

    if (/^or$/i.test(text)) {
      pendingOr = true
      continue
    }

    if (!day) continue

    const split = text.indexOf(' - ')
    if (split === -1) continue
    const name = text.slice(0, split).trim()
    let rest = text.slice(split + 3).trim()

    // A trailing "(...)" after the sets is a note, not part of the name.
    let note: string | undefined
    const noteMatch = /\(([^)]*)\)\s*$/.exec(rest)
    if (noteMatch) {
      note = noteMatch[1].trim()
      rest = rest.slice(0, noteMatch.index).trim()
    }
    rest = rest.replace(/^plate\s+/i, '')

    const id = slugify(name)
    const override = OVERRIDES[id] ?? {}
    const tokens = rest.split(/\s+/).filter(Boolean)
    const metric: Metric = override.metric ?? (tokens.some((t) => t.includes('x')) ? 'weight_reps' : 'reps')
    const unit: Unit = override.unit ?? 'kg'

    const sets = tokens.map((t) => parseToken(t, metric)).filter((s): s is WorkSet => s !== null)

    // A blank line inside a day marks the start of the extra/optional block.
    if (sawBlank) optional = true
    sawBlank = false

    let choiceId: string | undefined
    if (pendingOr && defs.length > 0) {
      const prev = defs[defs.length - 1]
      choiceId = prev.choiceId ?? `choice-${++choiceCounter}`
      prev.choiceId = choiceId
    }
    pendingOr = false

    defs.push({ id, name, day, optional, choiceId, metric, unit, note, targetSets: Math.max(sets.length, 3) })
    seeds[id] = sets
  }

  return { defs: stabiliseChoiceIds(defs), seeds }
}

/**
 * Re-key OR groups by their members instead of by position.
 *
 * Positional ids ("choice-1", "choice-2") shift whenever a group is added or
 * removed higher up the notes, which would silently move a stored choice onto
 * a different pair of exercises.
 */
function stabiliseChoiceIds(defs: ExerciseDef[]): ExerciseDef[] {
  const members = new Map<string, string[]>()
  for (const d of defs) {
    if (!d.choiceId) continue
    const list = members.get(d.choiceId) ?? []
    list.push(d.id)
    members.set(d.choiceId, list)
  }
  const stable = new Map<string, string>()
  for (const [temp, ids] of members) stable.set(temp, `choice:${[...ids].sort().join('+')}`)
  return defs.map((d) => (d.choiceId ? { ...d, choiceId: stable.get(d.choiceId) } : d))
}
