import { useState } from 'react'
import { formatClock, formatDate, formatSets, plural, sessionVolume, startOfDay } from '../lib/calc'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import { DAYS } from '../data/parse'
import { Icon } from './Icon'

export function HistoryView() {
  const store = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const { sessions } = store.state

  if (sessions.length === 0) {
    return <div className="empty">No workouts saved yet. Finish one and it lands here.</div>
  }

  const days = new Set(sessions.map((s) => startOfDay(s.startedAt)))
  const grid = Array.from({ length: 56 }, (_, i) => startOfDay(Date.now() - (55 - i) * 86400000))

  return (
    <div className="screen">
      <div className="section-title">Last 8 weeks</div>
      <div className="card">
        <div className="streak">
          {grid.map((d) => (
            <i
              key={d}
              style={days.has(d) ? { background: 'var(--success)' } : undefined}
              title={formatDate(d)}
            />
          ))}
        </div>
        <div className="tiny muted">{plural(days.size, 'training day')} in this window</div>
      </div>

      <div className="section-title">Workouts</div>
      {sessions.map((s) => {
        const label = DAYS.find((d) => d.id === s.day)?.label ?? s.day
        const sets = s.entries.reduce((n, e) => n + e.sets.length, 0)
        const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null
        const vol = sessionVolume(s, store.defs)
        const isOpen = open === s.id
        return (
          <div className="card" key={s.id}>
            <button
              className="hist"
              style={{ width: '100%', textAlign: 'left', '--dc': DAY_COLOR[s.day] } as React.CSSProperties}
              onClick={() => setOpen(isOpen ? null : s.id)}
            >
              <span className="hist__badge">{label}</span>
              <span className="hist__body">
                <span className="hist__title">{formatDate(s.startedAt)}</span>
                <span className="hist__meta">
                  {plural(s.entries.length, 'exercise')} · {plural(sets, 'set')}
                  {mins !== null ? ` · ${mins} min` : ''}
                  {vol > 0 ? ` · ${Math.round(vol).toLocaleString()} kg` : ''}
                </span>
              </span>
              <span className="muted" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} />
              </span>
            </button>

            {isOpen ? (
              <div style={{ marginTop: 10 }}>
                {s.entries.map((e) => {
                  const def = store.defs[e.exerciseId]
                  if (!def) return null
                  return (
                    <div className="log-line" key={e.exerciseId}>
                      <span className="n">{def.name}</span>
                      <span className="v">{formatSets(e.sets, def)}</span>
                    </div>
                  )
                })}
                {mins !== null ? (
                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    Duration {formatClock(Math.round(((s.finishedAt ?? 0) - s.startedAt) / 1000))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
