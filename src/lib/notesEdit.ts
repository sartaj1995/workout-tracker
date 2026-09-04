import { parseNotes, slugify } from '../data/parse'
import { resolveDay } from './plan'
import { DAYS } from '../data/parse'
import type { AppState, ExerciseDef } from './types'

export interface RemovedExercise {
  def: ExerciseDef
  /** How many saved workouts reference it — what's at stake if it's wrong. */
  sessions: number
}

export interface NotesChange {
  /** Exercises the app has never seen before under this id. */
  added: ExerciseDef[]
  removed: RemovedExercise[]
  warnings: string[]
  /** Best guess at which added exercise is a rename of which removed one. */
  suggested: Record<string, string>
  /**
   * Exercises per day after the edit, counted the way the rest of the app
   * counts them — OR groups collapsed to the one you'd actually do — so this
   * can be checked against the home screen at a glance.
   */
  counts: { day: string; label: string; core: number; extra: number }[]
}

/**
 * How alike two slugs are, by the words they share.
 *
 * Rough on purpose. It only decides what to *pre-select* on a screen that then
 * asks you to confirm, so a near miss costs a tap and a wrong confident answer
 * would cost a history.
 */
function similarity(a: string, b: string): number {
  const A = new Set(a.split('-').filter(Boolean))
  const B = new Set(b.split('-').filter(Boolean))
  if (A.size === 0 || B.size === 0) return 0
  const shared = [...A].filter((x) => B.has(x)).length
  return shared / Math.max(A.size, B.size)
}

/**
 * What saving these notes would do, worked out before anything is written.
 *
 * The point of the whole exercise is the rename case. Ids are slugs of names,
 * so tidying "Chest sup row" into "Chest supported row" reads to the app as
 * one exercise disappearing and an unrelated one arriving — the history, the
 * chart, the best and the stall count all stay behind on a name you can no
 * longer see. Anything that both appears and disappears in the same edit is
 * therefore worth asking about rather than assuming.
 */
export function planNotesChange(state: AppState, text: string): NotesChange {
  const renames = state.renames ?? {}
  const { defs, dayPlan, warnings } = parseNotes(text, renames)
  const known = new Set(state.catalog.map((d) => d.id))
  const live = state.catalog.filter((d) => !d.retired)

  // Coming back after being retired isn't an arrival — the history is still
  // attached to that id, and merging simply un-retires it.
  const added = defs.filter((d) => !known.has(d.id))
  const removed: RemovedExercise[] = live
    .filter((d) => !defs.some((n) => n.id === d.id))
    .map((def) => ({
      def,
      sessions: state.sessions.filter((s) => s.entries.some((e) => e.exerciseId === def.id)).length,
    }))

  const suggested: Record<string, string> = {}
  for (const a of added) {
    let bestId = ''
    let bestScore = 0
    for (const r of removed) {
      const score = similarity(slugify(a.name), slugify(r.def.name))
      if (score > bestScore) {
        bestScore = score
        bestId = r.def.id
      }
    }
    if (bestScore >= 0.4) suggested[a.id] = bestId
  }

  // resolveDay only reads these three fields; picks are empty because the
  // notes decide which side of a pair leads until you swap one in the app.
  const asState = { dayPlan, catalog: defs, choicePicks: {} } as AppState
  const counts = DAYS.map((d) => ({
    day: d.id,
    label: d.label,
    core: resolveDay(asState, d.id, false).length,
    extra: resolveDay(asState, d.id, true).length,
  }))

  return { added, removed, warnings, suggested, counts }
}
