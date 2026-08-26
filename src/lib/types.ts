export type DayId = 'push' | 'pull' | 'legs'

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

export interface Prefs {
  restSeconds: number
  barWeight: number
  /** Plate pairs available in the gym, heaviest first (kg, per side). */
  plates: number[]
  soundOn: boolean
  vibrateOn: boolean
  /** Smallest weight jump you can actually make, in kg. */
  weightStep: number
  /** Hit this many reps on a set and the app suggests adding weight. */
  repCeiling: number
}

export interface AppState {
  version: number
  catalog: ExerciseDef[]
  /** Last performed sets per exercise, used to prefill the next session. */
  seeds: Record<string, WorkSet[]>
  sessions: Session[]
  active: Session | null
  /** Remembers which side of an OR pair was picked last. */
  choicePicks: Record<string, string>
  prefs: Prefs
}
