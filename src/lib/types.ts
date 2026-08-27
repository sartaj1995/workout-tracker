export type DayId = 'push' | 'pull' | 'legs' | 'upper'

/** How a set is measured. Drives which input fields the UI shows. */
export type Metric =
  | 'weight_reps'  // 80x9
  | 'reps'         // pull-ups, free squats
  | 'time'         // hanging, wall sit
  | 'weight_time'  // farmer carry: 20kg x 60s

/** Whether the number on the stack is kilos or a plate index. */
export type Unit = 'kg' | 'plate'

export interface Drop {
  weight: number | null
  reps: number | null
}

export interface WorkSet {
  weight: number | null
  reps: number | null
  seconds: number | null
  drops: Drop[]
  done: boolean
}

export interface ExerciseDef {
  id: string
  name: string
  day: DayId
  /** Optional/extra work, shown in a collapsed section at the bottom. */
  optional: boolean
  /** Exercises sharing a choiceId are "this OR that" alternatives. */
  choiceId?: string
  metric: Metric
  unit: Unit
  /** Setup reminders: seat height, pin position, progression targets. */
  note?: string
  targetSets: number
  /**
   * Dropped from the notes but kept in the catalog, so past sessions and
   * charts that reference it still render. Never offered in a new workout.
   */
  retired?: boolean
}

export interface LoggedExercise {
  exerciseId: string
  sets: WorkSet[]
}

export interface Session {
  id: string
  day: DayId
  startedAt: number
  finishedAt?: number
  entries: LoggedExercise[]
}

/**
 * Something you did that isn't one of the tracked gym days — squash, a run.
 * Deliberately not a Session: there are no exercises, sets or progression to
 * record, and modelling it as one would drag it into the progress charts.
 */
export interface Activity {
  id: string
  name: string
  /** When it happened, which isn't always when it was logged. */
  at: number
  minutes?: number
}

export interface Prefs {
  restSeconds: number
  barWeight: number
  /** Plate pairs available in the gym, heaviest first (kg, per side). */
  plates: number[]
  soundOn: boolean
  vibrateOn: boolean
  /** Hold the screen awake while a workout is running. */
  keepScreenOn: boolean
  /** Smallest weight jump you can actually make, in kg. */
  weightStep: number
  /** Hit this many reps on a set and the app suggests adding weight. */
  repCeiling: number
}

/** One line of a day's plan: which exercise, and whether it's optional there. */
export interface DayPlanEntry {
  id: string
  optional: boolean
}

export interface AppState {
  version: number
  /** Fingerprint of the notes the catalog was built from. */
  notesHash: string
  /**
   * The running order of each day, built from the notes. Held separately from
   * the catalog because one exercise can appear on more than one day.
   */
  dayPlan: Record<string, DayPlanEntry[]>
  catalog: ExerciseDef[]
  /** Last performed sets per exercise, used to prefill the next session. */
  seeds: Record<string, WorkSet[]>
  sessions: Session[]
  activities: Activity[]
  active: Session | null
  /** Remembers which side of an OR pair was picked last. */
  choicePicks: Record<string, string>
  prefs: Prefs
}
