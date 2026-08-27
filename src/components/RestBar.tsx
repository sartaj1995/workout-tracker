import { formatClock } from '../lib/calc'
import type { RestTimer } from '../lib/useRestTimer'
import { Icon } from './Icon'

export function RestBar({ rest }: { rest: RestTimer }) {
  if (!rest.running) return null
  const over = rest.remaining <= 0
  // Progress is the bar's own background rather than a separate element, which
  // frees the middle for controls and reads better at a glance mid-set.
  const pct = Math.max(0, Math.min(100, (rest.remaining / Math.max(rest.total, 1)) * 100))

  return (
    <div className={`rest${over ? ' done' : ''}`}>
      <span className="rest__fill" style={{ width: `${pct}%` }} />

      <span className="rest__clock">{formatClock(rest.remaining)}</span>

      <div className="rest__adjust">
        <button onClick={() => rest.extend(-15)} aria-label="Take 15 seconds off the rest">
          −15
        </button>
        <button onClick={() => rest.extend(15)} aria-label="Add 15 seconds to the rest">
          +15
        </button>
      </div>

      <button className="rest__skip" onClick={rest.stop} aria-label="End rest">
        <Icon name="x" size={20} />
      </button>
    </div>
  )
}
