import { useState } from 'react'
import {
  STALL_AFTER,
  deload,
  formatDate,
  formatSets,
  isStalled,
  plural,
  round,
  sessionVolume,
  sessionsSinceBest,
  unitLabel,
} from '../lib/calc'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import type { DayId, ExerciseDef } from '../lib/types'
import { DAYS } from '../data/parse'
import { Icon } from './Icon'

const W = 320
const H = 150
const PAD = { l: 30, r: 8, t: 12, b: 20 }

function Chart({
  points,
  label,
  selected,
  onSelect,
}: {
  points: { at: number; top: number }[]
  label: string
  /** Index of the point being inspected, or -1 for none. */
  selected?: number
  onSelect?: (i: number) => void
}) {
  if (points.length < 2) return null

  const values = points.map((p) => p.top)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(max * 0.1, 1)
  const lo = min - span * 0.15
  const hi = max + span * 0.15

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

  const sel = selected
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.top).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--dc, var(--primary))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--dc, var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[hi, (hi + lo) / 2, lo].map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeWidth="0.6"
            strokeDasharray="2 3"
          />
          <text x={PAD.l - 5} y={y(v) + 3} textAnchor="end" fontSize="8" fill="var(--muted)">
            {Math.round(v)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#fade)" />
      <path d={line} fill="none" stroke="var(--dc, var(--primary))" strokeWidth="2" strokeLinejoin="round" />

      {sel !== undefined && sel >= 0 && sel < points.length ? (
        <line
          x1={x(sel)}
          x2={x(sel)}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke="var(--dc, var(--primary))"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />
      ) : null}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.top)}
          r={i === sel ? 5 : i === points.length - 1 ? 3.6 : 2.2}
          fill={p.top === max ? 'var(--warn)' : 'var(--dc, var(--primary))'}
          stroke={i === sel ? 'var(--surface)' : 'none'}
          strokeWidth={i === sel ? 1.6 : 0}
        />
      ))}

      {/*
        One hit area across the whole plot rather than a target per dot. The
        dots are 2px across — unhittable with a thumb — and at eight or more
        sessions per-dot targets big enough to tap would overlap each other.
        Tapping anywhere picks the nearest session by x.
      */}
      {onSelect ? (
        <rect
          x={PAD.l}
          y={0}
          width={W - PAD.l - PAD.r}
          height={H}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            const at = PAD.l + ((e.clientX - box.left) / box.width) * (W - PAD.l - PAD.r)
            let best = 0
            for (let i = 1; i < points.length; i++) {
              if (Math.abs(x(i) - at) < Math.abs(x(best) - at)) best = i
            }
            onSelect(best)
          }}
        />
      ) : null}

      <text x={PAD.l} y={H - 6} fontSize="8" fill="var(--muted)">
        {formatDate(points[0].at)}
      </text>
      <text x={W - PAD.r} y={H - 6} fontSize="8" fill="var(--muted)" textAnchor="end">
        {formatDate(points[points.length - 1].at)}
      </text>
    </svg>
  )
}

/**
 * What one point on a chart was.
 *
 * The reason to reach for a single session is nearly always that it looks
 * wrong — a dip you don't recognise. The note you wrote that day is the answer
 * to that question, and until now it only existed in History, which is not
 * where the question gets asked.
 */
function PointDetail({
  at,
  headline,
  detail,
  note,
}: {
  at: number
  headline: string
  detail?: string
  note?: string
}) {
  return (
    <div className="point-detail">
      <div className="point-detail__head">
        <span>{formatDate(at)}</span>
        <b>{headline}</b>
      </div>
      {detail ? <div className="point-detail__sets">{detail}</div> : null}
      {note ? (
        <p className="point-detail__note">
          <Icon name="pin" size={13} />
          <span>{note}</span>
        </p>
      ) : (
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>
          No note on this one. You can add one from History.
        </p>
      )}
    </div>
  )
}

export function ProgressView() {
  const store = useStore()
  const [mode, setMode] = useState<'lifts' | 'workload'>('lifts')
  const withHistory = store.state.catalog.filter((d) => store.historyFor(d.id).length > 0)
  const [picked, setPicked] = useState(withHistory[0]?.id ?? '')

  if (withHistory.length === 0) {
    return (
      <div className="empty">
        Nothing to chart yet. Save two workouts with the same exercise and its curve shows up here.
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="choice" style={{ padding: '0 0 var(--s-3)' }}>
        <button className={mode === 'lifts' ? 'on' : ''} onClick={() => setMode('lifts')}>
          Lifts
        </button>
        <button className={mode === 'workload' ? 'on' : ''} onClick={() => setMode('workload')}>
          Workload
        </button>
      </div>

      {mode === 'lifts' ? (
        <Lifts
          withHistory={withHistory}
          picked={picked}
          onPick={(id) => {
            setPicked(id)
            setMode('lifts')
          }}
        />
      ) : (
        <Workload />
      )}
    </div>
  )
}

function Lifts({
  withHistory,
  picked,
  onPick,
}: {
  withHistory: ExerciseDef[]
  picked: string
  onPick: (id: string) => void
}) {
  const store = useStore()

  /**
   * Everything that has stopped going up, worst first. Leads the tab because
   * it's the only thing on this screen that asks you to do something — the
   * charts below tell you how it's going, this tells you what to change.
   */
  const stalled = withHistory
    .map((d) => ({ def: d, since: sessionsSinceBest(store.historyFor(d.id)), history: store.historyFor(d.id) }))
    .filter((x) => isStalled(x.history))
    .sort((a, b) => b.since - a.since)

  const id = withHistory.some((d) => d.id === picked) ? picked : withHistory[0].id
  const def = store.defs[id]
  const history = store.historyFor(id)
  const first = history[0]
  const latest = history[history.length - 1]
  const best = Math.max(...history.map((h) => h.top))
  const change = first && first.top > 0 ? ((latest.top - first.top) / first.top) * 100 : 0
  const since = sessionsSinceBest(history)
  const rest = deload(def, store.state.prefs, latest.sets[0])
  // Held as a timestamp rather than an index so switching exercise simply
  // stops matching, instead of pointing at whatever now sits in that slot.
  const [selAt, setSelAt] = useState<number | null>(null)
  const sel = history.findIndex((h) => h.at === selAt)

  const metricLabel =
    def.metric === 'time' || def.metric === 'weight_time'
      ? 'best hold'
      : def.metric === 'reps'
        ? 'best set'
        : `est. 1RM (${unitLabel(def)})`

  return (
    <>
      {stalled.length ? (
        <>
          <p className="section-title" style={{ marginTop: 0 }}>
            Not moving
          </p>
          <div className="list-card">
            {stalled.map(({ def: d, since: n }) => (
              <button key={d.id} className="stall-row" onClick={() => onPick(d.id)}>
                <Icon name="alert" size={15} />
                <span className="stall-row__body">
                  <span className="stall-row__name">{d.name}</span>
                  <span className="stall-row__meta">
                    {plural(n, 'session')} since your best
                  </span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            ))}
          </div>
        </>
      ) : null}

      <select className="picker" value={id} onChange={(e) => onPick(e.target.value)}>
        {DAYS.map((day) => {
          const group = withHistory.filter((d) => d.day === day.id)
          if (group.length === 0) return null
          return (
            <optgroup key={day.id} label={day.label}>
              {group.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>

      <div className="stat-grid">
        <div className="stat">
          <b>{round(latest.top)}</b>
          <span>latest</span>
        </div>
        <div className="stat">
          <b>{round(best)}</b>
          <span>best</span>
        </div>
        <div className="stat">
          <b style={{ color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {change >= 0 ? '+' : ''}
            {Math.round(change)}%
          </b>
          <span>since start</span>
        </div>
      </div>

      {isStalled(history) ? (
        <div className="banner">
          <Icon name="alert" size={16} />
          <span>
            {plural(since, 'session')} without a new best.
            {rest
              ? ` Worth dropping to about ${rest} and building back up — you clear the old number with room to spare, and the way past it comes with it.`
              : ' Worth changing something: the rep target, the tempo, or where it sits in the session.'}
          </span>
        </div>
      ) : null}

      <div className="card">
        <div className="tiny muted" style={{ marginBottom: 4 }}>
          {metricLabel}
        </div>
        {history.length < 2 ? (
          <div className="small muted">One session logged. The line appears after the next one.</div>
        ) : (
          <Chart
            points={history}
            label={`${def.name} progress`}
            selected={sel}
            onSelect={(i) => setSelAt(history[i].at)}
          />
        )}
        {sel >= 0 ? (
          <PointDetail
            at={history[sel].at}
            headline={`${round(history[sel].top)} ${metricLabel.startsWith('est') ? unitLabel(def) : ''}`.trim()}
            detail={formatSets(history[sel].sets, def)}
            note={history[sel].note}
          />
        ) : null}
        {history.length >= 2 && !isStalled(history) ? (
          <div className="tiny muted">
            {since === 0
              ? 'Your best is the most recent session.'
              : `${plural(since, 'session')} since your best — flagged here after ${STALL_AFTER}.`}
          </div>
        ) : null}
      </div>

      <div className="section-title">Every session</div>
      <div className="card">
        {[...history].reverse().map((h) => (
          <div className="log-line" key={h.at}>
            <span className="n">{formatDate(h.at)}</span>
            <span className="v">{formatSets(h.sets, def)}</span>
            {h.note ? <span className="log-line__note">{h.note}</span> : null}
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * Total work per session, charted one day at a time.
 *
 * Never all days on one line: a Legs session moves several times the tonnage
 * of a Push one, so mixing them makes a sawtooth that tracks which day it was
 * rather than whether you're doing more.
 */
function Workload() {
  const store = useStore()
  const { sessions } = store.state

  // Sets and exercises come along because they're usually the explanation for
  // a low point — a session cut short is the same lifts with a set missing
  // from each, and the count says so before the note has to.
  const seriesFor = (day: DayId) =>
    sessions
      .filter((s) => s.day === day)
      .map((s) => ({
        at: s.finishedAt ?? s.startedAt,
        top: sessionVolume(s, store.defs),
        note: s.note,
        exercises: s.entries.length,
        sets: s.entries.reduce((n, e) => n + e.sets.length, 0),
      }))
      .filter((p) => p.top > 0)
      .sort((a, b) => a.at - b.at)

  const trained = DAYS.filter((d) => seriesFor(d.id).length > 0)
  const [day, setDay] = useState<DayId>(trained[0]?.id ?? 'push')
  // Held as a timestamp rather than an index so switching day simply stops
  // matching, instead of pointing at whatever now sits in that slot.
  const [selAt, setSelAt] = useState<number | null>(null)

  if (trained.length === 0) {
    return (
      <div className="empty">
        No weight-and-reps work logged yet. Workload adds up every kilo you move, so it needs a
        session with kilos in it.
      </div>
    )
  }

  const pick = trained.some((d) => d.id === day) ? day : trained[0].id
  const points = seriesFor(pick)
  const sel = points.findIndex((p) => p.at === selAt)
  const latest = points[points.length - 1]
  const best = Math.max(...points.map((p) => p.top))
  // Four and four, so one big or one washed-out session doesn't decide it.
  const recent = points.slice(-4)
  const prior = points.slice(-8, -4)
  const avg = (xs: { top: number }[]) => xs.reduce((n, p) => n + p.top, 0) / (xs.length || 1)
  const trend = prior.length ? ((avg(recent) - avg(prior)) / avg(prior)) * 100 : null

  return (
    <>
      <div className="choice" style={{ padding: '0 0 var(--s-3)' }}>
        {trained.map((d) => (
          <button key={d.id} className={d.id === pick ? 'on' : ''} onClick={() => setDay(d.id)}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <b>{Math.round(latest.top).toLocaleString()}</b>
          <span>last session</span>
        </div>
        <div className="stat">
          <b>{Math.round(best).toLocaleString()}</b>
          <span>best</span>
        </div>
        <div className="stat">
          {trend === null ? (
            <b className="muted">—</b>
          ) : (
            <b style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {trend >= 0 ? '+' : ''}
              {Math.round(trend)}%
            </b>
          )}
          <span>last 4 vs prev 4</span>
        </div>
      </div>

      <div className="card" style={{ '--dc': DAY_COLOR[pick] } as React.CSSProperties}>
        <div className="tiny muted" style={{ marginBottom: 4 }}>
          kg moved per session
        </div>
        {points.length < 2 ? (
          <div className="small muted">
            One session logged. The line appears after the next {trained.find((d) => d.id === pick)?.label}{' '}
            workout.
          </div>
        ) : (
          <Chart
            points={points}
            label={`${pick} workload`}
            selected={sel}
            onSelect={(i) => setSelAt(points[i].at)}
          />
        )}
        {sel >= 0 ? (
          <PointDetail
            at={points[sel].at}
            headline={`${Math.round(points[sel].top).toLocaleString()} kg`}
            detail={`${plural(points[sel].exercises, 'exercise')} · ${plural(points[sel].sets, 'set')}`}
            note={points[sel].note}
          />
        ) : null}
      </div>

      <p className="tiny muted">
        Weight × reps across every set and drop set, added up. Only lifts measured in kilos count —
        plate-numbered machines and timed holds are left out, because their numbers aren't kilos and
        summing them would make this mean nothing.
      </p>

      <div className="section-title">Every session</div>
      <div className="card">
        {[...points].reverse().map((p) => (
          <div className="log-line" key={p.at}>
            <span className="n">{formatDate(p.at)}</span>
            <span className="v">{Math.round(p.top).toLocaleString()} kg</span>
            {p.note ? <span className="log-line__note">{p.note}</span> : null}
          </div>
        ))}
      </div>
    </>
  )
}
