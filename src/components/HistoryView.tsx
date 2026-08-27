import { useState } from 'react'
import { formatClock, formatDate, formatSets, plural, sessionVolume, startOfDay } from '../lib/calc'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import type { Activity, Session } from '../lib/types'
import { DAYS } from '../data/parse'
import { Icon } from './Icon'

export function HistoryView() {
  const store = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const { sessions, activities } = store.state

  if (sessions.length === 0 && activities.length === 0) {
    return <div className="empty">Nothing saved yet. Finish a workout and it lands here.</div>
  }

  // The grid counts anything you did, so a squash day isn't a gap.
  const days = new Set([
    ...sessions.map((s) => startOfDay(s.startedAt)),
    ...activities.map((a) => startOfDay(a.at)),
  ])
  const grid = Array.from({ length: 56 }, (_, i) => startOfDay(Date.now() - (55 - i) * 86400000))

  const timeline = [
    ...sessions.map((s) => ({ at: s.startedAt, session: s as Session, activity: null })),
    ...activities.map((a) => ({ at: a.at, session: null, activity: a as Activity })),
  ].sort((a, b) => b.at - a.at)

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

      <div className="section-title">Everything you've done</div>
      {timeline.map((row) =>
        row.session ? (
          <SessionCard
            key={row.session.id}
            session={row.session}
            open={open === row.session.id}
            onToggle={() => setOpen(open === row.session!.id ? null : row.session!.id)}
          />
        ) : (
          <ActivityCard key={row.activity.id} activity={row.activity} />
        ),
      )}
    </div>
  )
}

function ActivityCard({ activity }: { activity: Activity }) {
  const store = useStore()
  return (
    <div className="card">
      <div className="hist" style={{ '--dc': 'var(--activity)' } as React.CSSProperties}>
        <span className="hist__badge">{activity.name.slice(0, 2)}</span>
        <span className="hist__body">
          <span className="hist__title">{activity.name}</span>
          <span className="hist__meta">
            {formatDate(activity.at)}
            {activity.minutes ? ` · ${activity.minutes} min` : ''}
          </span>
        </span>
        <button
          className="chip"
          onClick={() => store.removeActivity(activity.id)}
          aria-label={`Remove ${activity.name}`}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  )
}

function SessionCard({
  session,
  open,
  onToggle,
}: {
  session: Session
  open: boolean
  onToggle: () => void
}) {
  const store = useStore()
  const label = DAYS.find((d) => d.id === session.day)?.label ?? session.day
  const sets = session.entries.reduce((n, e) => n + e.sets.length, 0)
  const mins = session.finishedAt
    ? Math.round((session.finishedAt - session.startedAt) / 60000)
    : null
  const vol = sessionVolume(session, store.defs)

  return (
    <div className="card">
      <button
        className="hist"
        style={{ width: '100%', textAlign: 'left', '--dc': DAY_COLOR[session.day] } as React.CSSProperties}
        onClick={onToggle}
      >
        <span className="hist__badge">{label}</span>
        <span className="hist__body">
          <span className="hist__title">{formatDate(session.startedAt)}</span>
          <span className="hist__meta">
            {plural(session.entries.length, 'exercise')} · {plural(sets, 'set')}
            {mins !== null ? ` · ${mins} min` : ''}
            {vol > 0 ? ` · ${Math.round(vol).toLocaleString()} kg` : ''}
          </span>
        </span>
        <span className="muted" style={{ display: 'grid', placeItems: 'center' }}>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} />
        </span>
      </button>

      {open ? (
        <div style={{ marginTop: 10 }}>
          {session.entries.map((e) => {
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
              Duration{' '}
              {formatClock(Math.round(((session.finishedAt ?? 0) - session.startedAt) / 1000))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
