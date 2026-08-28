import { useEffect, useRef, useState } from 'react'
import { formatSets, isLogged, plural, score, suggestion, unitLabel } from '../lib/calc'
import { useStore } from '../lib/store'
import type { DayId, ExerciseDef, WorkSet } from '../lib/types'
import { Icon } from './Icon'
import { NumberField, Sheet } from './ui'

const ghost = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

/** So a choice pill can jump to the other side's card when both are on today. */
const cardId = (exerciseId: string) => `ex-${exerciseId}`

interface Props {
  /** The day this card is being logged under, so an OR pick stays on it. */
  day: DayId
  def: ExerciseDef
  sets: WorkSet[]
  prev: WorkSet[]
  members: ExerciseDef[]
  onLogged: () => void
}

export function ExerciseCard({ day, def, sets, prev, members, onLogged }: Props) {
  const store = useStore()
  const [editingNote, setEditingNote] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [noteDraft, setNoteDraft] = useState(def.note ?? '')

  const inSession = new Set(store.state.active?.entries.map((e) => e.exerciseId) ?? [])

  // With more than two alternatives the pill strip overflows, and the one this
  // card is for can start out scrolled off the end. Nudge it into view — only
  // sideways, so opening a session doesn't jump the page around.
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = strip.current
    const on = row?.querySelector<HTMLElement>('button.on')
    if (!row || !on) return
    row.scrollLeft += on.getBoundingClientRect().left - row.getBoundingClientRect().left - 14
  }, [def.id])

  const doneCount = sets.filter((s) => s.done).length
  const complete = doneCount > 0 && doneCount === sets.length
  const best = store.bestEver(def.id)
  const hitPR = best > 0 && sets.some((s) => s.done && score(s, def) > best)
  const tip = suggestion(prev[0], def, store.state.prefs)

  const unit = unitLabel(def)
  const showWeight = def.metric === 'weight_reps' || def.metric === 'weight_time'
  const showReps = def.metric === 'weight_reps' || def.metric === 'reps'
  const showSecs = def.metric === 'time' || def.metric === 'weight_time'

  /** Checking a set off accepts whatever ghost numbers are still showing. */
  function toggleDone(i: number) {
    const set = sets[i]
    if (set.done) {
      store.patchSet(def.id, i, { done: false })
      return
    }
    const p = prev[i]
    const patch: Partial<WorkSet> = { done: true }
    if (showWeight && set.weight === null) patch.weight = p?.weight ?? null
    if (showReps && set.reps === null) patch.reps = p?.reps ?? null
    if (showSecs && set.seconds === null) patch.seconds = p?.seconds ?? null
    store.patchSet(def.id, i, patch)
    set.drops.forEach((d, di) => {
      const pd = p?.drops[di]
      if (!pd) return
      store.patchDrop(def.id, i, di, {
        weight: d.weight ?? pd.weight,
        reps: d.reps ?? pd.reps,
      })
    })
    if (isLogged({ ...set, ...patch } as WorkSet, def)) onLogged()
  }

  return (
    <div id={cardId(def.id)} className={`ex${complete ? ' complete' : ''}`}>
      <div className="ex-head">
        <div className="title">
          {def.name}
          <span className="last">
            {prev.length ? `Last: ${formatSets(prev, def)}` : 'No history yet'}
          </span>
        </div>
        <span className={`progress-pill${complete ? ' done' : ''}`}>
          {doneCount}/{sets.length}
        </span>
      </div>

      {members.length > 1 ? (
        <div className="choice" ref={strip}>
          {members.map((m) => {
            const here = m.id === def.id
            // Both sides of a pair can be on today's list at once, so a pill
            // says "in today's session", not "instead of this one".
            const alsoOn = !here && inSession.has(m.id)
            return (
              <button
                key={m.id}
                className={here ? 'on' : alsoOn ? 'also' : ''}
                aria-pressed={here || alsoOn}
                onClick={() =>
                  alsoOn
                    ? document
                        .getElementById(cardId(m.id))
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    : store.pickChoice(day, def.choiceId!, m.id)
                }
              >
                {m.name}
              </button>
            )
          })}
        </div>
      ) : null}

      {def.note ? (
        <button
          className="note"
          onClick={() => {
            setNoteDraft(def.note ?? '')
            setEditingNote(true)
          }}
        >
          <Icon name="pin" size={15} />
          <span>{def.note}</span>
        </button>
      ) : null}

      <div className="sets">
        {sets.map((set, i) => (
          <div key={i}>
            <div className="set-row">
              <span className="idx">{i + 1}</span>
              {showWeight ? (
                <NumberField
                  value={set.weight}
                  onChange={(v) => store.patchSet(def.id, i, { weight: v })}
                  placeholder={ghost(prev[i]?.weight)}
                  caption={unit}
                />
              ) : null}
              {showWeight && (showReps || showSecs) ? <span className="times">×</span> : null}
              {showReps ? (
                <NumberField
                  value={set.reps}
                  onChange={(v) => store.patchSet(def.id, i, { reps: v })}
                  placeholder={ghost(prev[i]?.reps)}
                  caption="reps"
                  step={1}
                />
              ) : null}
              {showSecs ? (
                <NumberField
                  value={set.seconds}
                  onChange={(v) => store.patchSet(def.id, i, { seconds: v })}
                  placeholder={ghost(prev[i]?.seconds)}
                  caption="secs"
                  step={1}
                />
              ) : null}
              <button
                className={`check${set.done ? ' on' : ''}`}
                aria-label={`Set ${i + 1} done`}
                onClick={() => toggleDone(i)}
              >
                <Icon name="check" size={20} />
              </button>
            </div>

            {set.drops.map((drop, di) => (
              <div className="drop-row" key={di}>
                <span className="tag">DROP</span>
                <NumberField
                  value={drop.weight}
                  onChange={(v) => store.patchDrop(def.id, i, di, { weight: v })}
                  placeholder={ghost(prev[i]?.drops[di]?.weight)}
                />
                <span className="times">×</span>
                <NumberField
                  value={drop.reps}
                  onChange={(v) => store.patchDrop(def.id, i, di, { reps: v })}
                  placeholder={ghost(prev[i]?.drops[di]?.reps)}
                  step={1}
                />
                <button className="check" onClick={() => store.removeDrop(def.id, i, di)} aria-label="Remove drop set">
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}

            {def.metric === 'weight_reps' && i === sets.length - 1 ? (
              <div className="ex-actions" style={{ paddingLeft: 30, paddingBottom: 4 }}>
                <button className="chip" onClick={() => store.addDrop(def.id, i)}>
                  <Icon name="plus" size={14} /> drop set
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="ex-actions">
        <button className="chip" onClick={() => store.addSet(def.id)}>
          <Icon name="plus" size={14} /> set
        </button>
        {sets.length > 1 ? (
          <button className="chip" onClick={() => store.removeSet(def.id, sets.length - 1)}>
            <Icon name="minus" size={14} /> set
          </button>
        ) : null}
        {tip ? (
          <button
            className="chip suggest"
            onClick={() => {
              if (!prev[0]) return
              if (def.metric === 'time') store.patchSet(def.id, 0, { seconds: parseFloat(tip) })
              else if (def.metric === 'reps') store.patchSet(def.id, 0, { reps: parseFloat(tip) })
              else store.patchSet(def.id, 0, { weight: parseFloat(tip) })
            }}
          >
            <Icon name="arrowUp" size={14} /> try {tip}
          </button>
        ) : null}
        {hitPR ? (
          <span className="chip pr">
            <Icon name="trophy" size={14} /> new best
          </span>
        ) : null}
        {!def.note ? (
          <button
            className="chip"
            onClick={() => {
              setNoteDraft('')
              setEditingNote(true)
            }}
          >
            <Icon name="plus" size={14} /> note
          </button>
        ) : null}
        <button
          className="chip"
          onClick={() => (doneCount > 0 ? setConfirmRemove(true) : store.removeExercise(def.id))}
        >
          <Icon name="x" size={14} /> skip today
        </button>
      </div>

      {confirmRemove ? (
        <Sheet title={`Skip ${def.name}?`} onClose={() => setConfirmRemove(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            {plural(doneCount, 'set')} already logged here. Skipping drops{' '}
            {doneCount === 1 ? 'it' : 'them'} from today — the exercise itself stays in your plan,
            and you can add it back from the bottom of the session.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmRemove(false)}>
              Keep it
            </button>
            <div className="spacer" />
            <button
              className="btn danger"
              onClick={() => {
                store.removeExercise(def.id)
                setConfirmRemove(false)
              }}
            >
              Skip anyway
            </button>
          </div>
        </Sheet>
      ) : null}

      {editingNote ? (
        <Sheet title={`Note — ${def.name}`} onClose={() => setEditingNote(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Setup reminders you want in front of you: seat height, pin position, grip, what to try next.
          </p>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Seat on 4, back pad 2 notches forward"
            autoFocus
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => setEditingNote(false)}>
              Cancel
            </button>
            <div className="spacer" />
            <button
              className="btn primary"
              onClick={() => {
                store.setNote(def.id, noteDraft)
                setEditingNote(false)
              }}
            >
              Save
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
