import type { DayId, DayPlanEntry, ExerciseDef, Metric, Unit, WorkSet } from '../lib/types'
import { OVERRIDES, RAW_NOTES } from './notes'

/**
 * `rotation: false` marks a day you reach for *instead of* a rotation day when
 * time is short. It never claims the "up next" slot, and leaving it alone never
 * makes it overdue.
 */
export const DAYS: { id: DayId; label: string; rotation: boolean }[] = [
  { id: 'push', label: 'Push', rotation: true },
  { id: 'pull', label: 'Pull', rotation: true },
  { id: 'legs', label: 'Legs', rotation: true },
  { id: 'upper', label: 'Upper', rotation: false },
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
    const paired = /^(\d+(?:\.\d+)?)?x(\d+(?:\.\d+)?)?s?$/.exec(p)
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
  dayPlan: Record<string, DayPlanEntry[]>
  /**
   * Lines that parsed to nothing. Harmless when the notes ship with the build
   * and you'd notice on the next deploy; worth saying out loud once they're
   * edited on a phone, where a mistyped heading otherwise just loses exercises.
   */
  warnings: string[]
}

/**
 * `renames` maps a name's slug onto the id an exercise should keep.
 *
 * Ids are slugs of names, so renaming an exercise would otherwise read as
 * deleting one and creating another — severing every session, chart and best
 * from it. Holding the original id keeps the history, the notes you've added
 * and any entry in `OVERRIDES` attached to the exercise you actually meant.
 */
export function parseNotes(
  raw: string = RAW_NOTES,
  renames: Record<string, string> = {},
): ParsedNotes {
  const defs: ExerciseDef[] = []
  const seeds: Record<string, WorkSet[]> = {}
  const dayPlan: Record<string, DayPlanEntry[]> = {}
  const warnings: string[] = []
  const idFor = (name: string) => renames[slugify(name)] ?? slugify(name)
  for (const d of DAYS) dayPlan[d.id] = []

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

    if (!day) {
      warnings.push(`"${text}" is above the first day heading, so nothing reads it.`)
      continue
    }

    if (/\s[–—]\s/.test(text)) {
      warnings.push(`"${text}" uses a dash your phone made. Sets need a plain " - ".`)
    }

    const split = text.indexOf(' - ')

    // A bare name with no sets is a reference to an exercise defined under an
    // earlier day. The exercise itself is shared — same history, same charts —
    // it just also appears in this day's running order. Any OR alternatives it
    // already has come with it.
    if (split === -1) {
      const refId = idFor(text)
      if (defs.some((d) => d.id === refId)) {
        if (sawBlank) optional = true
        sawBlank = false
        pendingOr = false
        dayPlan[day].push({ id: refId, optional })
      } else {
        warnings.push(
          `"${text}" was dropped — a line with no " - " reuses an exercise from an earlier day, and there isn't one by that name.`,
        )
      }
      continue
    }

    const name = text.slice(0, split).trim()
    let rest = text.slice(split + 3).trim()

    // A trailing "(...)" after the sets is a note, not part of the name.
    let note: string | undefined
    const noteMatch = /\(([^)]*)\)\s*$/.exec(rest)
    if (noteMatch) {
      note = noteMatch[1].trim()
      rest = rest.slice(0, noteMatch.index).trim()
    }
    // "plate" in front of the sets means the numbers are pin positions, not kg.
    const plate = /^plate\s+/i.test(rest)
    rest = rest.replace(/^plate\s+/i, '')

    const id = idFor(name)
    const override = OVERRIDES[id] ?? {}
    const tokens = rest.split(/\s+/).filter(Boolean)
    // A trailing "s" is how you'd write a hold anyway — "110s", or "20x60s"
    // for a carry. OVERRIDES still wins where it has an entry, so notes
    // written before this syntax existed keep reading the way they always did.
    const hasWeight = tokens.some((t) => t.includes('x'))
    const timed = tokens.length > 0 && tokens.every((t) => /s$/i.test(t.split('+')[0]))
    const inferred: Metric = hasWeight
      ? timed
        ? 'weight_time'
        : 'weight_reps'
      : timed
        ? 'time'
        : 'reps'
    const metric: Metric = override.metric ?? inferred
    const unit: Unit = override.unit ?? (plate ? 'plate' : 'kg')

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
    dayPlan[day].push({ id, optional })
  }

  return { defs: stabiliseChoiceIds(defs), seeds, dayPlan, warnings }
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
