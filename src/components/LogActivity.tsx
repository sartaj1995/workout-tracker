import { useState } from 'react'
import { useStore } from '../lib/store'
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

const isoDay = (ts: number) => {
  const d = new Date(ts)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function LogActivity({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [name, setName] = useState('')
  // Defaults to today, but editable — these usually get logged the next morning.
  const [day, setDay] = useState(isoDay(Date.now()))
  const [minutes, setMinutes] = useState('')

  const trimmed = name.trim()

  function save() {
    if (!trimmed) return
    // Keep the current time of day when it's today, so ordering stays sensible.
    const picked = new Date(`${day}T00:00:00`)
    const now = new Date()
    const at =
      isoDay(now.getTime()) === day
        ? now.getTime()
        : picked.setHours(18, 0, 0, 0)
    store.addActivity(trimmed, at, minutes ? Number(minutes) : undefined)
    onClose()
  }

  return (
    <Sheet title="Log an activity" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Anything that isn't one of your gym days. It counts towards your week and streak, but
        won't change which session is up next.
      </p>

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
          <Icon name="check" size={17} /> Log it
        </button>
      </div>
    </Sheet>
  )
}
