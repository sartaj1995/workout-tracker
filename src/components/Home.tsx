import { plural, relativeDay, startOfDay } from '../lib/calc'
import { resolveDay } from '../lib/plan'
import { useStore } from '../lib/store'
import type { DayId } from '../lib/types'
import { DAYS } from '../data/parse'
import { DAY_COLOR, DAY_SHORT } from '../lib/theme'
import { BackupNudge } from './BackupNudge'
import { Icon } from './Icon'

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Home({
  onOpenDay,
  onResume,
}: {
  onOpenDay: (day: DayId) => void
  onResume: () => void
}) {
  const store = useStore()
  const { sessions, active } = store.state

  const lastOf = (day: DayId) => sessions.find((s) => s.day === day)

  // The rotation leads with whichever day you've left longest. Substitute days
  // sit outside it entirely: they never claim the slot, and leaving one alone
  // never makes it overdue. A day with no exercises has nothing to train.
  const rotation = DAYS.filter((d) => d.rotation)
  const substitutes = DAYS.filter((d) => !d.rotation)
  const ready = rotation.filter((d) => resolveDay(store.state, d.id, false).length > 0)
  const due = [...ready].sort((a, b) => (lastOf(a.id)?.startedAt ?? 0) - (lastOf(b.id)?.startedAt ?? 0))[0]
  const showNext = sessions.length > 0 && !active

  const thisWeek = sessions.filter((s) => s.startedAt > Date.now() - 7 * 86400000).length
  const streak = countStreak(sessions.map((s) => s.startedAt))

  // Last seven days, oldest first, so today sits on the right.
  const week = Array.from({ length: 7 }, (_, i) => {
    const at = startOfDay(Date.now() - (6 - i) * 86400000)
    const session = sessions.find((s) => startOfDay(s.startedAt) === at)
    return { at, day: session?.day ?? null }
  })

  const dayCard = (d: (typeof DAYS)[number]) => {
    const last = lastOf(d.id)
    const count = resolveDay(store.state, d.id, false).length
    const extras = resolveDay(store.state, d.id, true).length
    const isNext = showNext && due?.id === d.id
    const empty = count === 0 && extras === 0
    return (
      <button
        key={d.id}
        className={`day-card${isNext ? ' day-card--next' : ''}`}
        style={{ '--dc': DAY_COLOR[d.id] } as React.CSSProperties}
        onClick={() => onOpenDay(d.id)}
      >
        <span className="day-card__rail" />
        <span className="day-card__body">
          {isNext ? (
            <span className="badge">
              <Icon name="flame" size={12} /> Up next
            </span>
          ) : null}
          <span className="day-card__name">{d.label}</span>
          <span className="day-card__meta">
            {empty ? 'Not set up yet' : plural(count, 'exercise')}
            {!empty && extras ? ` · ${extras} extra` : ''}
          </span>
          <span className="day-card__last">
            {empty
              ? 'Add exercises to your notes'
              : last
                ? `Last trained ${relativeDay(last.startedAt)}`
                : 'Not trained yet'}
          </span>
        </span>
        <span className="day-card__go">
          <Icon name="chevronRight" size={22} />
        </span>
      </button>
    )
  }

  return (
    <div className="screen">
      <BackupNudge />

      {active ? (
        <button className="resume" onClick={onResume}>
          <span className="resume__dot" />
          <span className="resume__body">
            <span className="resume__title">
              {DAYS.find((d) => d.id === active.day)?.label} workout in progress
            </span>
            <span className="resume__meta">
              {plural(
                active.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0),
                'set',
              )}{' '}
              logged · started {relativeDay(active.startedAt)}
            </span>
          </span>
          <Icon name="chevronRight" />
        </button>
      ) : null}

      <p className="section-title">Choose your session</p>
      <div className="day-grid">{rotation.map(dayCard)}</div>

      {substitutes.length ? (
        <>
          <p className="section-title">Short on time</p>
          <div className="day-grid">{substitutes.map(dayCard)}</div>
          <p className="tiny muted" style={{ marginTop: 'var(--s-2)' }}>
            Swap one of these in for a rotation day. It doesn't change what's up next.
          </p>
        </>
      ) : null}

      <p className="section-title">This week</p>
      <div className="week-strip">
        {week.map((d) => {
          const isToday = d.at === startOfDay(Date.now())
          const label = DAYS.find((x) => x.id === d.day)?.label
          return (
            <div
              key={d.at}
              className={`week-day${d.day ? ' week-day--done' : ''}${isToday ? ' week-day--today' : ''}`}
              style={d.day ? ({ '--dc': DAY_COLOR[d.day] } as React.CSSProperties) : undefined}
              title={label ? `${label} on ${new Date(d.at).toDateString()}` : 'Rest day'}
            >
              <span className="week-day__label">{WEEKDAY[new Date(d.at).getDay()]}</span>
              <span className="week-day__mark" aria-label={label ? `${label} day` : 'Rest day'}>
                {d.day ? DAY_SHORT[d.day] : ''}
              </span>
            </div>
          )
        })}
      </div>

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

      {sessions.length === 0 ? (
        <p className="empty">
          Your notes are already loaded. Open a day to look through it — nothing starts recording
          until you tap Start workout.
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
