import type { AppState, DayId, ExerciseDef } from './types'

/**
 * The exercises actually on the menu for a day, in the order the notes list
 * them, with OR choices resolved to whichever side is currently picked.
 *
 * Driven by the day's plan rather than by scanning the catalog, because one
 * exercise can appear on more than one day — Upper reuses lifts from Push and
 * Pull — and each day has its own running order.
 */
export function resolveDay(state: AppState, day: DayId, optional: boolean): ExerciseDef[] {
  const plan = state.dayPlan?.[day] ?? []
  const byId = new Map(state.catalog.map((d) => [d.id, d]))
  const out: ExerciseDef[] = []
  const seenGroups = new Set<string>()

  for (const entry of plan) {
    if (entry.optional !== optional) continue
    const def = byId.get(entry.id)
    if (!def || def.retired) continue

    if (!def.choiceId) {
      out.push(def)
      continue
    }

    if (seenGroups.has(def.choiceId)) continue
    seenGroups.add(def.choiceId)
    const members = state.catalog.filter((x) => x.choiceId === def.choiceId && !x.retired)
    if (members.length === 0) continue
    out.push(members.find((m) => m.id === state.choicePicks[def.choiceId!]) ?? members[0])
  }

  return out
}
