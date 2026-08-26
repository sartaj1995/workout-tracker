import { useEffect, useState } from 'react'
import { formatClock, formatSets } from '../lib/calc'
import { resolveDay } from '../lib/plan'
import { useStore } from '../lib/state'
import type { RestTimer } from '../lib/useRestTimer'
import { DAYS } from '../data/parse'
import { ExerciseCard } from './ExerciseCard'
import { Sheet } from './ui'

export function SessionView({ rest, onExit }: { rest: RestTimer; onExit: () => void }) {
  const store = useStore()
  const session = store.state.active
  const [showExtras, setShowExtras] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  if (!session) return null

  const day = DAYS.find((d) => d.id === session.day)
  const extras = resolveDay(store.state, session.day, true)
  const coreIds = new Set(resolveDay(store.state, session.day, false).map((d) => d.id))
  const elapsed = Math.floor((now - session.startedAt) / 1000)
  const loggedSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  return (
    <div className="app">
      <header className="top">
        <button className="icon-btn" onClick={onExit} aria-label="Back">
          ←
        </button>
        <h1>
          {day?.label} day
          <span className="sub">
            {formatClock(elapsed)} elapsed · {loggedSets} sets logged
          </span>
        </h1>
      </header>

      <div className="screen" style={{ paddingBottom: 'calc(150px + var(--safe-b))' }}>
        {session.entries.map((entry) => {
          const def = store.defs[entry.exerciseId]
          if (!def) return null
          const members = def.choiceId
            ? store.state.catalog.filter((d) => d.choiceId === def.choiceId)
            : [def]
          return (
            <ExerciseCard
              key={entry.exerciseId}
              def={def}
              sets={entry.sets}
              prev={store.state.seeds[entry.exerciseId] ?? []}
              members={members}
              extra={!coreIds.has(entry.exerciseId)}
              onLogged={() => rest.start()}
            />
          )
        })}

        {extras.length ? (
          <button className="btn block ghost" onClick={() => setShowExtras(true)}>
            ＋ Extra work ({extras.length} available)
          </button>
        ) : null}
      </div>

      <div className="actionbar">
        <div className="inner">
          <button className="btn ghost danger" onClick={onExit}>
            Pause
          </button>
          <button className="btn success" style={{ flex: 2 }} onClick={() => setConfirmFinish(true)}>
            Finish workout
          </button>
        </div>
      </div>

      {showExtras ? (
        <Sheet title="Extra work" onClose={() => setShowExtras(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Tap to add to today's session.
          </p>
          {store.state.catalog
            .filter((d) => d.day === session.day && d.optional)
            .map((d) => {
              const already = session.entries.some((e) => e.exerciseId === d.id)
              const prev = store.state.seeds[d.id] ?? []
              return (
                <button
                  key={d.id}
                  className="card"
                  style={{ width: '100%', textAlign: 'left', opacity: already ? 0.45 : 1 }}
                  disabled={already}
                  onClick={() => {
                    store.addExtra(d.id)
                    setShowExtras(false)
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div className="small muted">
                    {already ? 'Already added' : prev.length ? formatSets(prev, d) : 'No history yet'}
                  </div>
                </button>
              )
            })}
        </Sheet>
      ) : null}

      {confirmFinish ? (
        <Sheet title="Finish workout?" onClose={() => setConfirmFinish(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            {loggedSets} sets logged. Unchecked sets are dropped, and today's numbers become the
            starting point for next time.
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn ghost" onClick={() => setConfirmFinish(false)}>
              Keep going
            </button>
            <div className="spacer" />
            <button
              className="btn success"
              onClick={() => {
                store.finishSession()
                rest.stop()
                setConfirmFinish(false)
                onExit()
              }}
            >
              Save workout
            </button>
          </div>
          <button
            className="btn block ghost danger"
            style={{ marginTop: 14 }}
            onClick={() => {
              store.discardSession()
              rest.stop()
              setConfirmFinish(false)
              onExit()
            }}
          >
            Discard without saving
          </button>
        </Sheet>
      ) : null}
    </div>
  )
}
