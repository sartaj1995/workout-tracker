import type { AppState, DayId, ExerciseDef } from './types'

/**
 * Which side of an OR pair leads is remembered per day, not globally: the same
 * pair can sit on Push and on Upper, and picking dumbbells on one shouldn't
 * decide the other. The "|" separates the day from the group's own id, which
 * already contains ":" and "+".
 */
export const pickKey = (day: DayId, choiceId: string) => `${day}|${choiceId}`

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

    const choiceId = def.choiceId
    if (!choiceId) {
      out.push(def)
      continue
    }

    if (seenGroups.has(choiceId)) continue
    seenGroups.add(choiceId)
    const members = state.catalog.filter((x) => x.choiceId === choiceId && !x.retired)
    if (members.length === 0) continue
    out.push(members.find((m) => m.id === state.choicePicks[pickKey(day, choiceId)]) ?? members[0])
  }

  return out
}
