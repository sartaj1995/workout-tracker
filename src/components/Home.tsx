import { plural, relativeDay, startOfDay } from '../lib/calc'
import { resolveDay } from '../lib/plan'
import { useStore } from '../lib/state'
import type { DayId } from '../lib/types'
import { DAYS } from '../data/parse'

const DAY_COLOR: Record<DayId, string> = {
  push: 'var(--push)',
  pull: 'var(--pull)',
  legs: 'var(--legs)',
}

export function Home({ onStart, onResume }: { onStart: (day: DayId) => void; onResume: () => void }) {
  const store = useStore()
  const { sessions, active } = store.state

  const lastOf = (day: DayId) => sessions.find((s) => s.day === day)

  // Whichever day you've left longest is the one the app nudges you toward.
  const due = [...DAYS].sort((a, b) => {
    const la = lastOf(a.id)?.startedAt ?? 0
    const lb = lastOf(b.id)?.startedAt ?? 0
    return la - lb
  })[0]

  const thisWeek = sessions.filter((s) => s.startedAt > Date.now() - 7 * 86400000).length
  const streak = countStreak(sessions.map((s) => s.startedAt))

  return (
    <div className="screen">
      {active ? (
        <button className="day-card" style={{ '--dc': DAY_COLOR[active.day] } as React.CSSProperties} onClick={onResume}>
          <span className="dot" />
          <span>
            <span className="name">Resume {DAYS.find((d) => d.id === active.day)?.label}</span>
            <span className="meta">
              {active.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)} sets logged ·
              started {relativeDay(active.startedAt)}
            </span>
          </span>
          <span className="chev">›</span>
        </button>
      ) : null}

      <div className="stat-grid">
        <div className="stat">
          <b>{sessions.length}</b>
          <span>workouts</span>
        </div>
        <div className="stat">
          <b>{thisWeek}</b>
          <span>this week</span>
        </div>
        <div className="stat">
          <b>{streak}</b>
          <span>week streak</span>
        </div>
      </div>

      <div className="section-title">Start a workout</div>
      <div className="day-grid">
        {DAYS.map((d) => {
          const last = lastOf(d.id)
          const count = resolveDay(store.state, d.id, false).length
          const extras = resolveDay(store.state, d.id, true).length
          return (
            <button
              key={d.id}
              className="day-card"
              style={{ '--dc': DAY_COLOR[d.id] } as React.CSSProperties}
              onClick={() => onStart(d.id)}
            >
              <span className="dot" />
              <span>
                <span className="name">
                  {d.label}
                  {!active && due.id === d.id && sessions.length > 0 ? (
                    <span className="chip" style={{ marginLeft: 8, fontSize: 11, padding: '3px 8px' }}>
                      up next
                    </span>
                  ) : null}
                </span>
                <span className="meta">
                  {plural(count, 'exercise')}
                  {extras ? ` · ${extras} extra` : ''} ·{' '}
                  {last ? `last ${relativeDay(last.startedAt)}` : 'never done'}
                </span>
              </span>
              <span className="chev">›</span>
            </button>
          )
        })}
      </div>

      {sessions.length === 0 ? (
        <p className="small muted" style={{ textAlign: 'center' }}>
          Your notes are already loaded. Pick a day and every exercise shows up with last time's
          numbers ready to accept.
        </p>
      ) : null}
    </div>
  )
}

/** Consecutive weeks (counting back from this one) with at least one workout. */
function countStreak(times: number[]): number {
  if (times.length === 0) return 0
  const weekOf = (ts: number) => Math.floor(startOfDay(ts) / (7 * 86400000))
  const weeks = new Set(times.map(weekOf))
  let week = weekOf(Date.now())
  if (!weeks.has(week)) week -= 1
  let streak = 0
  while (weeks.has(week)) {
    streak += 1
    week -= 1
  }
  return streak
}
