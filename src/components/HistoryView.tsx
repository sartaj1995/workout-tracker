import { useCallback, useEffect, useState } from 'react'
import { formatClock, formatDate, formatSets, plural, sessionVolume, startOfDay } from '../lib/calc'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import type { Activity, Session } from '../lib/types'
import { DAYS } from '../data/parse'
import {
  ConfirmDeleteSession,
  EditExercise,
  EditSessionDate,
  EditSessionNote,
} from './EditSession'
import { Icon } from './Icon'
import { LogActivity } from './LogActivity'

export function HistoryView() {
  const store = useStore()
  const [open, setOpen] = useState<string | null>(null)
  // Held here rather than on the card, because the card is the thing that just
  // vanished — an undo living inside it would go with it.
  const [undo, setUndo] = useState<Undone | null>(null)
  // Correcting one opens the very sheet that logs one, pre-filled.
  const [editing, setEditing] = useState<Activity | null>(null)
  // Stable, so a re-render cannot restart the toast's countdown.
  const dismissUndo = useCallback(() => setUndo(null), [])
  const { sessions, activities } = store.state

  /*
   * Built before the empty check on purpose. Deleting your last row lands you
   * on the empty state, and a toast that only renders when something is left
   * would go missing exactly when the delete was most total.
   */
  const undoToast = undo ? (
    <UndoDelete
      id={undo.kind === 'session' ? undo.session.id : undo.activity.id}
      message={undoMessage(undo)}
      onUndo={() => {
        if (undo.kind === 'session') store.restoreSession(undo.session)
        else store.restoreActivity(undo.activity)
        setUndo(null)
      }}
      onDismiss={dismissUndo}
    />
  ) : null

  if (sessions.length === 0 && activities.length === 0) {
    return (
      <>
        <div className="empty">Nothing saved yet. Finish a workout and it lands here.</div>
        {undoToast}
      </>
    )
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
      {undoToast}

      {timeline.map((row) =>
        row.session ? (
          <SessionCard
            key={row.session.id}
            session={row.session}
            open={open === row.session.id}
            onToggle={() => setOpen(open === row.session!.id ? null : row.session!.id)}
            onDeleted={(deleted) => setUndo({ kind: 'session', session: deleted })}
          />
        ) : (
          <ActivityCard
            key={row.activity.id}
            activity={row.activity}
            onEdit={() => setEditing(row.activity!)}
            onDelete={() => {
              store.removeActivity(row.activity!.id)
              setUndo({ kind: 'activity', activity: row.activity! })
            }}
          />
        ),
      )}

      {editing ? <LogActivity activity={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

/**
 * The window in which a delete is still a mistake rather than a decision.
 *
 * Eight seconds rather than the three-to-five a plain toast gets: this one
 * carries an action, so it has to be read, understood and acted on, not just
 * noticed. Long enough to catch "that was the wrong card", short enough that
 * it isn't sitting there as clutter.
 */
const UNDO_MS = 8000

/** Either kind of thing this screen can delete. */
type Undone =
  | { kind: 'session'; session: Session }
  | { kind: 'activity'; activity: Activity }

function undoMessage(undone: Undone): string {
  if (undone.kind === 'activity') {
    return `${undone.activity.name} on ${formatDate(undone.activity.at)} deleted`
  }
  const label = DAYS.find((d) => d.id === undone.session.day)?.label ?? undone.session.day
  return `${label} workout from ${formatDate(undone.session.startedAt)} deleted`
}

function UndoDelete({
  id,
  message,
  onUndo,
  onDismiss,
}: {
  /** What was deleted, so deleting a second thing restarts the countdown. */
  id: string
  message: string
  onUndo: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, UNDO_MS)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    // role="status" announces it without pulling focus away from the list.
    <div className="undo" role="status" aria-live="polite">
      <span className="undo__text">{message}</span>
      <button className="undo__action" onClick={onUndo} aria-label={`Undo — ${message}`}>
        Undo
      </button>
      <span className="undo__bar" aria-hidden="true" />
    </div>
  )
}

/**
 * A logged activity, correctable in place.
 *
 * The row itself is the way in, rather than a pencil beside the cross — two
 * small targets on one line is how you delete the thing you meant to edit.
 * Workouts already read this way: you tap what you want to change.
 */
function ActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="card">
      <div className="hist" style={{ '--dc': 'var(--activity)' } as React.CSSProperties}>
        <button className="hist__tap" onClick={onEdit} aria-label={`Edit ${activity.name}`}>
          <span className="hist__badge">{activity.name.slice(0, 2)}</span>
          <span className="hist__body">
            <span className="hist__title">{activity.name}</span>
            <span className="hist__meta">
              {formatDate(activity.at)}
              {activity.minutes ? ` · ${activity.minutes} min` : ''}
            </span>
          </span>
        </button>
        <button className="chip" onClick={onDelete} aria-label={`Remove ${activity.name}`}>
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
  onDeleted,
}: {
  session: Session
  open: boolean
  onToggle: () => void
  onDeleted: (session: Session) => void
}) {
  const store = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [noting, setNoting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dating, setDating] = useState(false)
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
          {/* Every line is a way in: the reason to open a saved workout is
              nearly always one number that went in wrong. */}
          {session.entries.map((e) => {
            const def = store.defs[e.exerciseId]
            if (!def) return null
            return (
              <button
                className="log-line log-line--edit"
                key={e.exerciseId}
                onClick={() => setEditing(e.exerciseId)}
              >
                <span className="n">{def.name}</span>
                <span className="v">{formatSets(e.sets, def)}</span>
                <Icon name="pencil" size={13} />
              </button>
            )
          })}

          <button className="session-note" onClick={() => setNoting(true)}>
            <Icon name="pin" size={14} />
            <span>{session.note ?? 'Add a note about this workout'}</span>
          </button>

          <div className="ex-actions" style={{ paddingLeft: 0, marginTop: 4 }}>
            {mins !== null ? (
              <span className="tiny muted" style={{ alignSelf: 'center' }}>
                Duration{' '}
                {formatClock(Math.round(((session.finishedAt ?? 0) - session.startedAt) / 1000))}
              </span>
            ) : null}
            <div className="spacer" />
            <button className="chip" onClick={() => setDating(true)}>
              <Icon name="calendar" size={14} /> change date
            </button>
            <button className="chip" onClick={() => setDeleting(true)}>
              <Icon name="trash" size={14} /> delete workout
            </button>
          </div>
        </div>
      ) : null}

      {editing && store.defs[editing] ? (
        <EditExercise
          session={session}
          def={store.defs[editing]}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {noting ? <EditSessionNote session={session} onClose={() => setNoting(false)} /> : null}
      {dating ? <EditSessionDate session={session} onClose={() => setDating(false)} /> : null}
      {deleting ? (
        <ConfirmDeleteSession
          session={session}
          label={label}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  )
}
