import { useState } from 'react'
import { formatDate, formatSets, round, unitLabel } from '../lib/calc'
import { useStore } from '../lib/state'
import type { ExerciseDef } from '../lib/types'
import { DAYS } from '../data/parse'

const W = 320
const H = 150
const PAD = { l: 30, r: 8, t: 12, b: 20 }

function Chart({ points, def }: { points: { at: number; top: number }[]; def: ExerciseDef }) {
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
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${def.name} progress`}>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
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
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.top)}
          r={i === points.length - 1 ? 3.6 : 2.2}
          fill={p.top === max ? 'var(--warn)' : 'var(--accent)'}
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
  const withHistory = store.state.catalog.filter((d) => store.historyFor(d.id).length > 0)
  const [picked, setPicked] = useState(withHistory[0]?.id ?? '')

  if (withHistory.length === 0) {
    return (
      <div className="empty">
        Nothing to chart yet. Save two workouts with the same exercise and its curve shows up here.
      </div>
    )
  }

  const id = withHistory.some((d) => d.id === picked) ? picked : withHistory[0].id
  const def = store.defs[id]
  const history = store.historyFor(id)
  const first = history[0]
  const latest = history[history.length - 1]
  const best = Math.max(...history.map((h) => h.top))
  const change = first && first.top > 0 ? ((latest.top - first.top) / first.top) * 100 : 0

  const metricLabel =
    def.metric === 'time' || def.metric === 'weight_time'
      ? 'best hold'
      : def.metric === 'reps'
        ? 'best set'
        : `est. 1RM (${unitLabel(def)})`

  return (
    <div className="screen">
      <select className="picker" value={id} onChange={(e) => setPicked(e.target.value)}>
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

      <div className="card">
        <div className="tiny muted" style={{ marginBottom: 4 }}>
          {metricLabel}
        </div>
        {history.length < 2 ? (
          <div className="small muted">One session logged. The line appears after the next one.</div>
        ) : (
          <Chart points={history} def={def} />
        )}
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
    </div>
  )
}
