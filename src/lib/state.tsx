import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cloneSet, emptySet, isLogged, score, topScore } from './calc'
import { pickKey, resolveDay } from './plan'
import { StoreCtx, type Store } from './store'
import { loadState, mergeFromNotes, saveState } from './storage'
import type { AppState, ExerciseDef, Session, WorkSet } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * A fresh, empty set list shaped like last time's: same number of sets and the
 * same drop-set structure. Last time's numbers show as ghost placeholders, so
 * checking a set off without typing logs exactly what you did before.
 */
function startingSets(state: AppState, def: ExerciseDef): WorkSet[] {
  const seed = state.seeds[def.id]
  const count = seed?.length || def.targetSets
  return Array.from({ length: count }, (_, i) => ({
    ...emptySet(),
    drops: (seed?.[i]?.drops ?? []).map(() => ({ weight: null, reps: null })),
  }))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    saveState(state)
  }, [state])

  const store = useMemo<Store>(() => {
    const update = (fn: (s: AppState) => AppState) => setState(fn)

    const inActive = (exerciseId: string, fn: (sets: WorkSet[]) => WorkSet[]) =>
      update((s) => {
        if (!s.active) return s
        return {
          ...s,
          active: {
            ...s.active,
            entries: s.active.entries.map((e) =>
              e.exerciseId === exerciseId ? { ...e, sets: fn(e.sets) } : e,
            ),
          },
        }
      })

    const defs = Object.fromEntries(state.catalog.map((d) => [d.id, d])) as Record<string, ExerciseDef>

    return {
      state,
      defs,
      update,

      startSession: (day) =>
        update((s) => {
          const entries = resolveDay(s, day, false).map((def) => ({
            exerciseId: def.id,
            sets: startingSets(s, def),
          }))
          const session: Session = { id: uid(), day, startedAt: Date.now(), entries }
          return { ...s, active: session }
        }),

      discardSession: () => update((s) => ({ ...s, active: null })),

      finishSession: () =>
        update((s) => {
          if (!s.active) return s
          const entries = s.active.entries
            .map((e) => ({ ...e, sets: e.sets.filter((set) => isLogged(set, defs[e.exerciseId])) }))
            .filter((e) => e.sets.length > 0)
          if (entries.length === 0) return { ...s, active: null }
          const done: Session = { ...s.active, entries, finishedAt: Date.now() }
          const seeds = { ...s.seeds }
          for (const e of entries) seeds[e.exerciseId] = e.sets.map(cloneSet)
          return { ...s, active: null, seeds, sessions: [done, ...s.sessions] }
        }),

      patchSet: (exerciseId, index, patch) =>
        inActive(exerciseId, (sets) => sets.map((s, i) => (i === index ? { ...s, ...patch } : s))),

      addSet: (exerciseId) => inActive(exerciseId, (sets) => [...sets, emptySet()]),

      removeSet: (exerciseId, index) => inActive(exerciseId, (sets) => sets.filter((_, i) => i !== index)),

      addDrop: (exerciseId, index) =>
        inActive(exerciseId, (sets) =>
          sets.map((s, i) => {
            if (i !== index) return s
            const last = s.drops[s.drops.length - 1]
            const from = last ?? { weight: s.weight, reps: s.reps }
            return { ...s, drops: [...s.drops, { weight: from.weight, reps: null }] }
          }),
        ),

      patchDrop: (exerciseId, index, di, patch) =>
        inActive(exerciseId, (sets) =>
          sets.map((s, i) =>
            i === index ? { ...s, drops: s.drops.map((d, j) => (j === di ? { ...d, ...patch } : d)) } : s,
          ),
        ),

      removeDrop: (exerciseId, index, di) =>
        inActive(exerciseId, (sets) =>
          sets.map((s, i) => (i === index ? { ...s, drops: s.drops.filter((_, j) => j !== di) } : s)),
        ),

      swapChoice: (day, choiceId, newId) =>
        update((s) => {
          const picks = { ...s.choicePicks, [pickKey(day, choiceId)]: newId }
          const next = { ...s, choicePicks: picks }
          // Only touch the running session if the swap was made on its own day.
          if (!s.active || s.active.day !== day) return next
          const members = s.catalog.filter((d) => d.choiceId === choiceId).map((d) => d.id)
          const def = s.catalog.find((d) => d.id === newId)
          if (!def) return next
          const entries = s.active.entries.map((e) =>
            members.includes(e.exerciseId) && e.exerciseId !== newId
              ? { exerciseId: newId, sets: startingSets(next, def) }
              : e,
          )
          return { ...next, active: { ...s.active, entries } }
        }),

      addExercise: (exerciseId) =>
        update((s) => {
          if (!s.active || s.active.entries.some((e) => e.exerciseId === exerciseId)) return s
          const def = s.catalog.find((d) => d.id === exerciseId)
          if (!def) return s
          const entry = { exerciseId, sets: startingSets(s, def) }

          // Put a skipped exercise back where the plan had it; extras go last.
          const plan = resolveDay(s, s.active.day, false).map((d) => d.id)
          const rank = plan.indexOf(exerciseId)
          const entries = [...s.active.entries]
          if (rank !== -1) {
            const at = entries.findIndex((e) => {
              const r = plan.indexOf(e.exerciseId)
              return r === -1 || r > rank
            })
            entries.splice(at === -1 ? entries.length : at, 0, entry)
          } else {
            entries.push(entry)
          }
          return { ...s, active: { ...s.active, entries } }
        }),

      removeExercise: (exerciseId) =>
        update((s) =>
          s.active
            ? {
                ...s,
                active: { ...s.active, entries: s.active.entries.filter((e) => e.exerciseId !== exerciseId) },
              }
            : s,
        ),

      addActivity: (name, at, minutes) =>
        update((s) => ({
          ...s,
          activities: [{ id: uid(), name, at, minutes }, ...s.activities].sort(
            (a, b) => b.at - a.at,
          ),
        })),

      removeActivity: (id) =>
        update((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) })),

      setNote: (exerciseId, note) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.map((d) => (d.id === exerciseId ? { ...d, note: note.trim() || undefined } : d)),
        })),

      setPrefs: (patch) => update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),

      reloadNotes: () => update((s) => mergeFromNotes(s)),

      replaceState: (next) => setState(next),

      bestEver: (exerciseId) => {
        const def = defs[exerciseId]
        if (!def) return 0
        let best = 0
        for (const s of state.sessions) {
          const entry = s.entries.find((e) => e.exerciseId === exerciseId)
          if (entry) best = Math.max(best, topScore(entry.sets, def))
        }
        return best
      },

      historyFor: (exerciseId) => {
        const def = defs[exerciseId]
        if (!def) return []
        return state.sessions
          .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
          .map((s) => {
            const entry = s.entries.find((e) => e.exerciseId === exerciseId)
            const sets = entry ? entry.sets : []
            return {
              at: s.finishedAt ?? s.startedAt,
              top: Math.max(...sets.map((x) => score(x, def)), 0),
              sets,
            }
          })
          .sort((a, b) => a.at - b.at)
      },
    }
  }, [state])

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}
