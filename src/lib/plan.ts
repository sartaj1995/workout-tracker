import type { AppState, DayId, ExerciseDef } from './types'

/** The exercises actually on the menu for a day, with OR choices resolved. */
export function resolveDay(state: AppState, day: DayId, optional: boolean): ExerciseDef[] {
  const out: ExerciseDef[] = []
  const seenGroups = new Set<string>()
  for (const d of state.catalog) {
    if (d.retired || d.day !== day || d.optional !== optional) continue
    if (d.choiceId) {
      if (seenGroups.has(d.choiceId)) continue
      seenGroups.add(d.choiceId)
      const members = state.catalog.filter((x) => x.choiceId === d.choiceId && !x.retired)
      const picked = members.find((m) => m.id === state.choicePicks[d.choiceId!])
      if (members.length) out.push(picked ?? members[0])
    } else {
      out.push(d)
    }
  }
  return out
}
