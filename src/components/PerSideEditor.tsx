import { formatSets, plural } from '../lib/calc'
import { useStore } from '../lib/store'
import { DAYS } from '../data/parse'
import { Sheet, Toggle } from './ui'

/**
 * Which exercises count double towards workload.
 *
 * Not guessable from the name with any confidence — "Lateral raise" and
 * "Bicep curls" say nothing about how many implements are involved, and
 * "Hammer curls (sitting, alternate)" turns on whether the reps you write down
 * are per arm or across both. So it's asked rather than inferred.
 *
 * Only exercises measured in kilos are listed. Plate-numbered machines and
 * timed holds don't reach the kg total in the first place, so a switch on them
 * would do nothing.
 */
export function PerSideEditor({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const counts = store.state.catalog.filter(
    (d) => !d.retired && d.metric === 'weight_reps' && d.unit === 'kg',
  )
  const on = counts.filter((d) => d.perSide).length

  return (
    <Sheet title="Counted twice" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Turn one on where the weight you write down is what's in <em>one</em> hand and both sides
        get worked — two dumbbells, or one arm at a time logged as a single set. Workload then
        counts both, because that's what you actually moved.
      </p>
      <p className="small muted">
        For anything alternating, it comes down to what your reps mean: tick it if{' '}
        <code>12.5x13</code> is thirteen per arm, leave it if thirteen is the whole set.
      </p>

      {DAYS.map((day) => {
        const group = counts.filter((d) => d.day === day.id)
        if (group.length === 0) return null
        return (
          <div key={day.id}>
            <p className="section-title">{day.label}</p>
            <div className="list-card">
              {group.map((d) => (
                <div className="setting per-side-row" key={d.id}>
                  <label>
                    {d.name}
                    <small>
                      {store.state.seeds[d.id]?.length
                        ? formatSets(store.state.seeds[d.id], d)
                        : 'No history yet'}
                    </small>
                  </label>
                  <Toggle on={!!d.perSide} onChange={(v) => store.setPerSide(d.id, v)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <p className="tiny muted">
        {plural(on, 'exercise')} counting double. Every workload figure, past ones included, is
        worked out fresh from your sets — so this corrects the whole history, not just what comes
        next. Your progress charts are untouched: a dumbbell number means one dumbbell there, the
        way it's normally quoted.
      </p>

      <button className="btn block primary" style={{ marginTop: 4 }} onClick={onClose}>
        Done
      </button>
    </Sheet>
  )
}
