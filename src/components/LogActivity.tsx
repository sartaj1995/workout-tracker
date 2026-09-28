import { useState } from 'react'
import { formatDate, isoDay, timeOnDay } from '../lib/calc'
import { useStore } from '../lib/store'
import type { Activity } from '../lib/types'
import { Icon } from './Icon'
import { Sheet } from './ui'

/** Common enough to be one tap; anything else is typed. */
const SUGGESTIONS = [
  'Squash',
  'Basketball',
  'Football',
  'Running',
  'Cycling',
  'Swimming',
  'Tennis',
  'Badminton',
  'Walk',
  'Yoga',
]

/**
 * Logging an activity, and correcting one.
 *
 * The same sheet does both rather than a second form for edits: the name
 * suggestions are as useful for fixing a typo as for the first entry, and two
 * forms would be two things to keep in step.
 */
export function LogActivity({
  onClose,
  activity,
}: {
  onClose: () => void
  /** Present when correcting one that is already logged. */
  activity?: Activity
}) {
  const store = useStore()
  const editing = activity !== undefined
  const [name, setName] = useState(activity?.name ?? '')
  // Defaults to today, but editable — these usually get logged the next morning.
  const [day, setDay] = useState(isoDay(activity ? activity.at : Date.now()))
  const [minutes, setMinutes] = useState(activity?.minutes ? String(activity.minutes) : '')

  const trimmed = name.trim()

  function save() {
    if (!trimmed) return
    const mins = minutes ? Number(minutes) : undefined
    if (activity) {
      // Hold the original timestamp when the day has not moved. Correcting a
      // spelling should not quietly restamp when the thing happened.
      const at = day === isoDay(activity.at) ? activity.at : timeOnDay(day)
      store.updateActivity(activity.id, { name: trimmed, at, minutes: mins })
    } else {
      store.addActivity(trimmed, timeOnDay(day), mins)
    }
    onClose()
  }

  return (
    <Sheet title={editing ? 'Edit activity' : 'Log an activity'} onClose={onClose}>
      {editing ? null : (
        <p className="small muted" style={{ marginTop: 0 }}>
          Anything that isn't one of your gym days. It counts towards your week and streak, but
          won't change which session is up next.
        </p>
      )}

      <div className="ex-actions" style={{ padding: 0, marginBottom: 'var(--s-3)' }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className={`chip${trimmed === s ? ' suggest' : ''}`}
            onClick={() => setName(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="setting">
        <label htmlFor="activity-name">Activity</label>
        <input
          id="activity-name"
          type="text"
          style={{ width: 150 }}
          value={name}
          placeholder="Squash"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="setting">
        <label htmlFor="activity-day">Day</label>
        <input
          id="activity-day"
          type="date"
          style={{ width: 150 }}
          value={day}
          max={isoDay(Date.now())}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      <div className="setting">
        <label htmlFor="activity-mins">
          Minutes
          <small>Optional</small>
        </label>
        <input
          id="activity-mins"
          type="number"
          inputMode="numeric"
          value={minutes}
          placeholder="60"
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>

      <div className="row" style={{ marginTop: 'var(--s-4)' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="spacer" />
        <button className="btn primary" disabled={!trimmed} onClick={save}>
          <Icon name="check" size={17} /> {editing ? 'Save' : 'Log it'}
        </button>
      </div>
    </Sheet>
  )
}

/**
 * Asked before the cross on a logged activity does anything.
 *
 * The undo bar used to be the only guard, and it guards the wrong moment for
 * the likeliest mistake. The whole row opens the editor, so the cross beside it
 * is the easy thing to catch by accident — and the bar answers that at the
 * bottom of the screen, on a clock, away from the row you were looking at. This
 * catches the slip before anything has changed. The undo still follows, for a
 * yes given about the wrong row.
 */
export function ConfirmDeleteActivity({
  activity,
  onClose,
  onDeleted,
}: {
  activity: Activity
  onClose: () => void
  /** Handed the deleted activity so the caller can offer to put it back. */
  onDeleted: (activity: Activity) => void
}) {
  const store = useStore()

  return (
    <Sheet title={`Delete ${activity.name} from ${formatDate(activity.at)}?`} onClose={onClose}>
      <div className="row">
        <button className="btn ghost" onClick={onClose}>
          Keep it
        </button>
        <div className="spacer" />
        <button
          className="btn danger"
          onClick={() => {
            store.removeActivity(activity.id)
            onClose()
            onDeleted(activity)
          }}
        >
          Delete
        </button>
      </div>
    </Sheet>
  )
}
