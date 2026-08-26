import { parseNotes } from '../data/parse'
import type { AppState, ExerciseDef, Prefs, WorkSet } from './types'

const KEY = 'workout-tracker/v1'

export const DEFAULT_PREFS: Prefs = {
  restSeconds: 90,
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  soundOn: true,
  vibrateOn: true,
  weightStep: 2.5,
  repCeiling: 10,
}

export function freshState(): AppState {
  const { defs, seeds } = parseNotes()
  return {
    version: 1,
    catalog: defs,
    seeds,
    sessions: [],
    active: null,
    choicePicks: {},
    prefs: { ...DEFAULT_PREFS },
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const base = freshState()
    return {
      ...base,
      ...parsed,
      prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
      catalog: parsed.catalog?.length ? parsed.catalog : base.catalog,
      seeds: { ...base.seeds, ...(parsed.seeds ?? {}) },
      sessions: parsed.sessions ?? [],
      choicePicks: parsed.choicePicks ?? {},
      active: parsed.active ?? null,
    }
  } catch {
    return freshState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked (private mode). Nothing useful to do here.
  }
}

/**
 * Re-read the notes file: pick up new exercises and changed structure while
 * keeping every set you've logged and every note you've added in the app.
 */
export function mergeFromNotes(state: AppState): AppState {
  const { defs, seeds } = parseNotes()
  const existing = new Map(state.catalog.map((d) => [d.id, d]))
  const catalog: ExerciseDef[] = defs.map((d) => {
    const prev = existing.get(d.id)
    return prev ? { ...d, note: prev.note ?? d.note } : d
  })
  const custom = state.catalog.filter((d) => !defs.some((n) => n.id === d.id))
  const mergedSeeds: Record<string, WorkSet[]> = { ...seeds, ...state.seeds }
  return { ...state, catalog: [...catalog, ...custom], seeds: mergedSeeds }
}

export function downloadBackup(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBackup(file: File): Promise<AppState> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Partial<AppState>
  if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('Not a workout backup file')
  const base = freshState()
  return {
    ...base,
    ...parsed,
    prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
    catalog: parsed.catalog?.length ? parsed.catalog : base.catalog,
    seeds: { ...base.seeds, ...(parsed.seeds ?? {}) },
  } as AppState
}
