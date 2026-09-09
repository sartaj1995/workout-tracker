import { isoDay, score } from './calc'
import type { AppState, ExerciseDef, WorkSet } from './types'

/**
 * One row per set.
 *
 * That's the atomic fact this app records, and everything else — a session's
 * volume, an exercise's best, a month's tonnage — is a pivot away from it. Any
 * coarser grain would bake one of those summaries in and throw the rest away.
 *
 * Drop sets get their own rows rather than being crushed into a text field,
 * flagged in `kind` and carrying their parent's set number. They count towards
 * volume but not towards a score, and rows are the only shape that lets a
 * spreadsheet honour both.
 */
const COLUMNS = [
  'date',
  'day',
  'exercise',
  'exercise_id',
  'metric',
  'unit',
  'per_side',
  'kind',
  'set',
  'weight',
  'reps',
  'seconds',
  'score',
  'volume_kg',
  'workout_note',
] as const

/**
 * RFC 4180. Quote anything holding a comma, quote or newline, and double up
 * internal quotes.
 *
 * Not defensive programming — two exercises are already called things like
 * "Hammer curls (sitting, alternate)", and a workout note is free text that
 * can hold anything at all.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** What this one row adds to the day's tonnage, by the app's own rules. */
function rowVolume(def: ExerciseDef | undefined, weight: number | null, reps: number | null): number | '' {
  // Matches sessionVolume: only kilo-measured weight×reps work counts, because
  // a plate index isn't a kilo and adding it in would make the total a fiction.
  if (!def || def.metric !== 'weight_reps' || def.unit !== 'kg') return ''
  const total = (weight ?? 0) * (reps ?? 0)
  return def.perSide ? total * 2 : total
}

export function toCsv(state: AppState): string {
  const defs = Object.fromEntries(state.catalog.map((d) => [d.id, d])) as Record<string, ExerciseDef>
  const rows: string[] = [COLUMNS.join(',')]

  // Oldest first: a spreadsheet reads a time series downwards, and the app
  // stores newest-first for its own screens.
  const sessions = [...state.sessions].sort(
    (a, b) => (a.finishedAt ?? a.startedAt) - (b.finishedAt ?? b.startedAt),
  )

  for (const session of sessions) {
    const date = isoDay(session.startedAt)
    for (const entry of session.entries) {
      const def = defs[entry.exerciseId]
      entry.sets.forEach((set: WorkSet, i) => {
        const common = [
          date,
          session.day,
          // A def should always be there — removal retires rather than deletes
          // — but a hand-edited backup could arrive without one, and dropping
          // the row silently would lose a set you actually did.
          def?.name ?? entry.exerciseId,
          entry.exerciseId,
          def?.metric ?? '',
          def?.unit ?? '',
          def?.perSide ? 'yes' : 'no',
        ]
        rows.push(
          [
            ...common,
            'set',
            i + 1,
            set.weight,
            set.reps,
            set.seconds,
            // Blank rather than zero where there's no def to score against.
            def ? round2(score(set, def)) : '',
            rowVolume(def, set.weight, set.reps),
            session.note,
          ]
            .map(cell)
            .join(','),
        )

        for (const drop of set.drops) {
          rows.push(
            [
              ...common,
              'drop',
              i + 1,
              drop.weight,
              drop.reps,
              '',
              // Deliberately blank: drops are accumulated fatigue, not evidence
              // of a higher ceiling, so the app excludes them from scoring too.
              '',
              rowVolume(def, drop.weight, drop.reps),
              session.note,
            ]
              .map(cell)
              .join(','),
          )
        }
      })
    }
  }

  return rows.join('\r\n')
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Rows in the file, so the UI can say whether it exported anything. */
export function countRows(state: AppState): number {
  return state.sessions.reduce(
    (n, s) =>
      n +
      s.entries.reduce(
        (m, e) => m + e.sets.reduce((k, set) => k + 1 + set.drops.length, 0),
        0,
      ),
    0,
  )
}

export function downloadCsv(state: AppState): void {
  // The BOM is for Excel, which otherwise reads a UTF-8 file as the local
  // codepage and mangles anything non-ASCII in a note. Every other tool
  // tolerates it.
  const blob = new Blob(['\uFEFF', toCsv(state)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workout-sets-${isoDay(Date.now())}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
