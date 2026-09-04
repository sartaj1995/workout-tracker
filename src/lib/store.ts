import { createContext, useContext } from 'react'
import type { AppState, DayId, ExerciseDef, Prefs, Session, WorkSet } from './types'

export interface Store {
  state: AppState
  defs: Record<string, ExerciseDef>
  update: (fn: (s: AppState) => AppState) => void
  startSession: (day: DayId) => void
  discardSession: () => void
  finishSession: (note?: string) => void
  /** Replace a saved workout with an edited copy of it, and re-seed from it. */
  saveSession: (session: Session) => void
  deleteSession: (id: string) => void
  patchSet: (exerciseId: string, index: number, patch: Partial<WorkSet>) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, index: number) => void
  addDrop: (exerciseId: string, index: number) => void
  patchDrop: (exerciseId: string, index: number, di: number, patch: Partial<WorkSet>) => void
  removeDrop: (exerciseId: string, index: number, di: number) => void
  /**
   * Take up `newId` from an OR pair on `day`. Swaps in place when the side on
   * show is still untouched; otherwise the new one joins it, so both get
   * logged and nothing already entered is lost.
   */
  pickChoice: (day: DayId, choiceId: string, newId: string) => void
  addExercise: (exerciseId: string) => void
  removeExercise: (exerciseId: string) => void
  addActivity: (name: string, at: number, minutes?: number) => void
  removeActivity: (id: string) => void
  setNote: (exerciseId: string, note: string) => void
  /** Mark an exercise as counting double towards workload. */
  setPerSide: (exerciseId: string, on: boolean) => void
  setPrefs: (patch: Partial<Prefs>) => void
  reloadNotes: () => void
  /** Adopt edited notes. `renames` maps a new name's slug to the id it keeps. */
  saveNotes: (text: string, renames: Record<string, string>) => void
  resetNotes: () => void
  replaceState: (next: AppState) => void
  bestEver: (exerciseId: string) => number
  historyFor: (exerciseId: string) => { at: number; top: number; sets: WorkSet[] }[]
}

export const StoreCtx = createContext<Store | null>(null)

export function useStore(): Store {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
