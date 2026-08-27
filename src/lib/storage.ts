import { RAW_NOTES } from '../data/notes'
import { parseNotes } from '../data/parse'
import type { AppState, ExerciseDef, Prefs, WorkSet } from './types'

const KEY = 'workout-tracker/v1'

/**
 * Cheap fingerprint of the notes file. When it changes the catalog is rebuilt
 * on the next load, so editing notes.ts and redeploying is enough — no need to
 * remember to hit "Reload exercises from notes".
 */
function hashNotes(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export const DEFAULT_PREFS: Prefs = {
  restSeconds: 90,
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  soundOn: true,
  vibrateOn: true,
  keepScreenOn: true,
  weightStep: 2.5,
  repCeiling: 10,
}

export function freshState(): AppState {
  const { defs, seeds, dayPlan } = parseNotes()
  return {
    version: 1,
    notesHash: hashNotes(RAW_NOTES),
    dayPlan,
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
    const state: AppState = {
      ...base,
      ...parsed,
      prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
      catalog: parsed.catalog?.length ? parsed.catalog : base.catalog,
      seeds: { ...base.seeds, ...(parsed.seeds ?? {}) },
      sessions: parsed.sessions ?? [],
      // Picks used to be keyed by pair alone. Those keys mean nothing now, so
      // drop them rather than carry dead entries forever.
      choicePicks: Object.fromEntries(
        Object.entries(parsed.choicePicks ?? {}).filter(([k]) => k.includes('|')),
      ),
      active: parsed.active ?? null,
    }
    // dayPlan arrived after the first releases, so rebuild if it's missing.
    const current = state.notesHash === base.notesHash && state.dayPlan
    return current ? state : mergeFromNotes(state)
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
 * Rebuild the catalog from the notes: pick up new exercises and structural
 * changes while keeping every set you've logged and every note you've added.
 *
 * Exercises no longer in the notes are retired rather than deleted, so old
 * sessions and progress charts that reference them still render — they just
 * stop being offered in new workouts.
 */
export function mergeFromNotes(state: AppState): AppState {
  const { defs, seeds, dayPlan } = parseNotes()
  const existing = new Map(state.catalog.map((d) => [d.id, d]))
  const catalog: ExerciseDef[] = defs.map((d) => {
    const prev = existing.get(d.id)
    return prev ? { ...d, note: prev.note ?? d.note } : d
  })
  const dropped = state.catalog
    .filter((d) => !defs.some((n) => n.id === d.id))
    .map((d) => ({ ...d, retired: true }))
  const mergedSeeds: Record<string, WorkSet[]> = { ...seeds, ...state.seeds }
  return {
    ...state,
    notesHash: hashNotes(RAW_NOTES),
    dayPlan,
    catalog: [...catalog, ...dropped],
    seeds: mergedSeeds,
    // Notes are the source of truth for which side of an OR pair leads, so an
    // in-app swap must not outlive the edit that changed the order.
    choicePicks: {},
  }
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
  return readBackupText(await file.text())
}

/** Shared by file import and the Drive restore. */
export function readBackupText(text: string): AppState {
  const parsed = JSON.parse(text) as Partial<AppState>
  if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('Not a workout backup file')
  const base = freshState()
  const state = {
    ...base,
    ...parsed,
    prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
    catalog: parsed.catalog?.length ? parsed.catalog : base.catalog,
    seeds: { ...base.seeds, ...(parsed.seeds ?? {}) },
  } as AppState
  // A backup taken before a notes edit still lands on the current exercises.
  return state.notesHash === base.notesHash && state.dayPlan ? state : mergeFromNotes(state)
}
