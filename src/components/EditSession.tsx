import { useState } from 'react'
import { emptySet, unitLabel } from '../lib/calc'
import { useStore } from '../lib/store'
import type { ExerciseDef, Session, WorkSet } from '../lib/types'
import { Icon } from './Icon'
import { NumberField, Sheet } from './ui'

/**
 * Correcting a saved workout.
 *
 * One exercise at a time rather than the whole session at once: the reason to
 * come back here is almost always a single wrong number, and a sheet holding
 * every exercise of a session would be a wall of inputs to hunt through.
 *
 * Each sheet edits a draft and hands the whole session back on Save, so
 * Cancel is simply never calling it.
 */
export function EditExercise({
  session,
  def,
  onClose,
}: {
  session: Session
  def: ExerciseDef
  onClose: () => void
}) {
  const store = useStore()
  const entry = session.entries.find((e) => e.exerciseId === def.id)
  const [sets, setSets] = useState<WorkSet[]>(() =>
    (entry?.sets ?? []).map((s) => ({ ...s, drops: s.drops.map((d) => ({ ...d })) })),
  )
  const [confirmDrop, setConfirmDrop] = useState(false)

  const unit = unitLabel(def)
  const showWeight = def.metric === 'weight_reps' || def.metric === 'weight_time'
  const showReps = def.metric === 'weight_reps' || def.metric === 'reps'
  const showSecs = def.metric === 'time' || def.metric === 'weight_time'

  const patch = (i: number, p: Partial<WorkSet>) =>
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))

  const patchDrop = (i: number, di: number, p: { weight?: number | null; reps?: number | null }) =>
    setSets((prev) =>
      prev.map((s, j) =>
        j === i ? { ...s, drops: s.drops.map((d, k) => (k === di ? { ...d, ...p } : d)) } : s,
      ),
    )

  /** Hand the session back with this exercise's sets swapped in. */
  const commit = (next: WorkSet[]) => {
    store.saveSession({
      ...session,
      entries: session.entries.map((e) => (e.exerciseId === def.id ? { ...e, sets: next } : e)),
    })
    onClose()
  }

  return (
    <Sheet title={def.name} onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Fix a number you mistyped, or add the set you forgot to tick off. Clearing a set's numbers
        removes it.
      </p>

      <div className="sets" style={{ padding: 0 }}>
        {sets.map((set, i) => (
          <div key={i}>
            <div className="set-row">
              <span className="idx">{i + 1}</span>
              {showWeight ? (
                <NumberField
                  value={set.weight}
                  onChange={(v) => patch(i, { weight: v })}
                  caption={unit}
                />
              ) : null}
              {showWeight && (showReps || showSecs) ? <span className="times">×</span> : null}
              {showReps ? (
                <NumberField value={set.reps} onChange={(v) => patch(i, { reps: v })} caption="reps" step={1} />
              ) : null}
              {showSecs ? (
                <NumberField
                  value={set.seconds}
                  onChange={(v) => patch(i, { seconds: v })}
                  caption="secs"
                  step={1}
                />
              ) : null}
              <button
                className="check"
                aria-label={`Remove set ${i + 1}`}
                onClick={() => setSets((prev) => prev.filter((_, j) => j !== i))}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {set.drops.map((drop, di) => (
              <div className="drop-row" key={di}>
                <span className="tag">DROP</span>
                <NumberField value={drop.weight} onChange={(v) => patchDrop(i, di, { weight: v })} />
                <span className="times">×</span>
                <NumberField
                  value={drop.reps}
                  onChange={(v) => patchDrop(i, di, { reps: v })}
                  step={1}
                />
                <button
                  className="check"
                  aria-label="Remove drop set"
                  onClick={() =>
                    setSets((prev) =>
                      prev.map((s, j) =>
                        j === i ? { ...s, drops: s.drops.filter((_, k) => k !== di) } : s,
                      ),
                    )
                  }
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="ex-actions" style={{ paddingLeft: 0 }}>
        <button
          className="chip"
          onClick={() => setSets((prev) => [...prev, { ...emptySet(), done: true }])}
        >
          <Icon name="plus" size={14} /> set
        </button>
        {def.metric === 'weight_reps' && sets.length ? (
          <button
            className="chip"
            onClick={() =>
              setSets((prev) =>
                prev.map((s, j) =>
                  j === prev.length - 1
                    ? { ...s, drops: [...s.drops, { weight: s.weight, reps: null }] }
                    : s,
                ),
              )
            }
          >
            <Icon name="plus" size={14} /> drop set
          </button>
        ) : null}
        <button className="chip" onClick={() => setConfirmDrop(true)}>
          <Icon name="x" size={14} /> remove from this workout
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={() => commit(sets)}>
          Save
        </button>
      </div>

      {confirmDrop ? (
        <Sheet title={`Remove ${def.name}?`} onClose={() => setConfirmDrop(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            It comes out of this workout only — the exercise stays in your plan, and every other
            session that has it is untouched.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmDrop(false)}>
              Keep it
            </button>
            <div className="spacer" />
            <button className="btn danger" onClick={() => commit([])}>
              Remove
            </button>
          </div>
        </Sheet>
      ) : null}
    </Sheet>
  )
}

/** The day's own note — how it went, rather than how to set a machine up. */
export function EditSessionNote({ session, onClose }: { session: Session; onClose: () => void }) {
  const store = useStore()
  const [draft, setDraft] = useState(session.note ?? '')

  return (
    <Sheet title="How did it go?" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Anything that explains these numbers later — how you slept, what hurt, what you'd change
        next time.
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Shoulder felt off on the last two sets. Slept badly."
        autoFocus
      />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="spacer" />
        <button
          className="btn primary"
          onClick={() => {
            store.saveSession({ ...session, note: draft.trim() || undefined })
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Sheet>
  )
}

export function ConfirmDeleteSession({
  session,
  label,
  onClose,
}: {
  session: Session
  label: string
  onClose: () => void
}) {
  const store = useStore()
  const sets = session.entries.reduce((n, e) => n + e.sets.length, 0)

  return (
    <Sheet title={`Delete this ${label} workout?`} onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        {sets} logged {sets === 1 ? 'set' : 'sets'} go with it, and the charts lose these points.
        There's no undo — export a backup first if you're unsure.
      </p>
      <div className="row">
        <button className="btn ghost" onClick={onClose}>
          Keep it
        </button>
        <div className="spacer" />
        <button
          className="btn danger"
          onClick={() => {
            store.deleteSession(session.id)
            onClose()
          }}
        >
          Delete workout
        </button>
      </div>
    </Sheet>
  )
}
