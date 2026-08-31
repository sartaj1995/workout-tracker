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

function Chart({ points, label }: { points: { at: number; top: number }[]; label: string }) {
  if (points.length < 2) return null

  const values = points.map((p) => p.top)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(max * 0.1, 1)
  const lo = min - span * 0.15
  const hi = max + span * 0.15

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

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

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.top)}
          r={i === points.length - 1 ? 3.6 : 2.2}
          fill={p.top === max ? 'var(--warn)' : 'var(--dc, var(--primary))'}
        />
      ))}

      <text x={PAD.l} y={H - 6} fontSize="8" fill="var(--muted)">
        {formatDate(points[0].at)}
      </text>
      <text x={W - PAD.r} y={H - 6} fontSize="8" fill="var(--muted)" textAnchor="end">
        {formatDate(points[points.length - 1].at)}
      </text>
    </svg>
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
          <Chart points={history} label={`${def.name} progress`} />
        )}
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

  const seriesFor = (day: DayId) =>
    sessions
      .filter((s) => s.day === day)
      .map((s) => ({ at: s.finishedAt ?? s.startedAt, top: sessionVolume(s, store.defs) }))
      .filter((p) => p.top > 0)
      .sort((a, b) => a.at - b.at)

  const trained = DAYS.filter((d) => seriesFor(d.id).length > 0)
  const [day, setDay] = useState<DayId>(trained[0]?.id ?? 'push')

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
          <Chart points={points} label={`${pick} workload`} />
        )}
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
          </div>
        ))}
      </div>
    </>
  )
}
