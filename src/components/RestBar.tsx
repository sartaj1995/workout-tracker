import { formatClock } from '../lib/calc'
import type { RestTimer } from '../lib/useRestTimer'

export function RestBar({ rest }: { rest: RestTimer }) {
  if (!rest.running) return null
  const over = rest.remaining <= 0
  const pct = Math.max(0, Math.min(100, (rest.remaining / rest.total) * 100))

  return (
    <div className={`rest${over ? ' done' : ''}`}>
      <span className="clock">{formatClock(rest.remaining)}</span>
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <button onClick={() => rest.extend(15)}>+15s</button>
      <button onClick={rest.stop}>{over ? 'Done' : 'Skip'}</button>
    </div>
  )
}
