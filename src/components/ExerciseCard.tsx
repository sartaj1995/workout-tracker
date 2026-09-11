import { useEffect, useRef, useState } from 'react'
import {
  formatClock,
  formatSets,
  heldSeconds,
  isLogged,
  isStalled,
  plural,
  score,
  sessionsSinceBest,
  suggestion,
  unitLabel,
} from '../lib/calc'
import { scheduleCountdown } from '../lib/sound'
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
  // Worth knowing while you can still do something about it — before you load
  // the same weight you've loaded the last five times without thinking.
  const history = store.historyFor(def.id)
  const stalled = isStalled(history)

  /**
   * Timing a hold.
   *
   * Held as the wall-clock moment it started rather than a running total, so
   * the count is correct whatever the page was doing in between — a locked
   * screen or a backgrounded tab throttles the interval, but the arithmetic
   * doesn't care. Only one at a time: you can't hold two things at once.
   *
   * Tap-to-tap is never the hold. There's the walk to the bar at one end and
   * the walk back to the phone at the other, and on a 35-second hang that's
   * the difference between a record and a guess. The start is made exact by a
   * countdown you sync to; the end can only be estimated, so it's trimmed.
   */
  const { holdCountdown, holdTrim, soundOn, vibrateOn } = store.state.prefs
  const [timing, setTiming] = useState<{ index: number; from: number } | null>(null)
  const cancelCues = useRef<(() => void) | null>(null)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!timing) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [timing])

  // Go's buzz can't ride the audio clock the way its tone does, but a timeout
  // is fine for a few seconds with the page in front of you.
  useEffect(() => {
    if (!timing || !vibrateOn) return
    const wait = timing.from + holdCountdown * 1000 - Date.now()
    if (wait <= 0) return
    const id = setTimeout(() => navigator.vibrate?.([60, 40, 60]), wait)
    return () => clearTimeout(id)
  }, [timing, holdCountdown, vibrateOn])

  // Nothing left scheduled if the card goes away mid-countdown.
  useEffect(() => () => cancelCues.current?.(), [])

  const now = Date.now()
  const goAt = timing ? timing.from + holdCountdown * 1000 : 0
  const counting = timing !== null && now < goAt
  const untilGo = counting ? Math.ceil((goAt - now) / 1000) : 0
  // Completed seconds, the way a stopwatch shows them. What actually gets
  // recorded is heldSeconds' decision, trim and all.
  const elapsed = timing && !counting ? Math.floor((now - goAt) / 1000) : 0

  /** Confirmations, not decoration — one short buzz at each end of a hold. */
  const buzz = () => {
    if (vibrateOn) navigator.vibrate?.(12)
  }

  function startTiming(i: number) {
    buzz()
    cancelCues.current?.()
    cancelCues.current = soundOn ? scheduleCountdown(holdCountdown) : null
    setTiming({ index: i, from: Date.now() })
  }

  function endTiming() {
    cancelCues.current?.()
    cancelCues.current = null
    setTiming(null)
  }

  /**
   * One target for both phases, judged by the clock at the moment of the tap
   * rather than by what was on screen at the last render — at 4.9s the button
   * still reads "1", but a tap landing at 5.1s is a stop, not a cancel.
   */
  function stopTiming() {
    if (!timing) return
    const stoppedAt = Date.now()
    const go = timing.from + holdCountdown * 1000
    const i = timing.index
    endTiming()
    // Before go, a tap means "not now" — not a hold of zero seconds.
    if (stoppedAt < go) return
    const secs = heldSeconds(go, stoppedAt, holdTrim)
    if (secs === null) return
    buzz()
    store.patchSet(def.id, i, { seconds: secs, done: true })
    onLogged()
  }

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
              {/*
                A hold can't be counted in your head while you're doing it, so
                the seconds field gets a stopwatch beside it. Same 48px target
                as the tick, and manual entry stays — you still want to type a
                number in when correcting one.
              */}
              {showSecs && !timing ? (
                <button
                  className="check timer-btn"
                  aria-label={`Start timing set ${i + 1}`}
                  onClick={() => startTiming(i)}
                >
                  <Icon name="timer" size={20} />
                </button>
              ) : null}
              <button
                className={`check${set.done ? ' on' : ''}`}
                aria-label={`Set ${i + 1} done`}
                onClick={() => toggleDone(i)}
              >
                <Icon name="check" size={20} />
              </button>
            </div>

            {/*
              Running, it takes the whole width. You're mid-hold and probably
              not looking carefully, so the thing to tap is the size of the row
              rather than an icon in the corner.
            */}
            {timing?.index === i ? (
              <button
                className={`timing${counting ? ' timing--ready' : ''}`}
                onClick={stopTiming}
                aria-label={
                  counting ? `Cancel — set ${i + 1} starts in ${untilGo}` : `Stop timing set ${i + 1}`
                }
              >
                <span className="timing__dot" aria-hidden="true" />
                <span className="timing__clock" role="timer" aria-live="off">
                  {counting ? untilGo : formatClock(elapsed)}
                </span>
                <span className="timing__hint">
                  {counting
                    ? 'Get ready · tap to cancel'
                    : holdTrim > 0
                      ? `Tap to stop · last ${holdTrim}s trimmed`
                      : 'Tap to stop'}
                </span>
              </button>
            ) : null}

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
        {stalled && !hitPR ? (
          <span className="chip stalled">
            <Icon name="alert" size={14} /> {plural(sessionsSinceBest(history), 'session')} since your
            best
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
