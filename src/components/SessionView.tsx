import { useEffect, useState } from 'react'
import { formatClock, formatSets, plural } from '../lib/calc'
import { primeToken } from '../lib/drive'
import { resolveDay } from '../lib/plan'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import type { ExerciseDef } from '../lib/types'
import type { RestTimer } from '../lib/useRestTimer'
import { DAYS } from '../data/parse'
import { ExerciseCard } from './ExerciseCard'
import { Icon } from './Icon'
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
  const inSession = new Set(session.entries.map((e) => e.exerciseId))
  const skipped = resolveDay(store.state, session.day, false).filter((d) => !inSession.has(d.id))
  const extras = resolveDay(store.state, session.day, true).filter((d) => !inSession.has(d.id))
  const available = skipped.length + extras.length
  const elapsed = Math.floor((now - session.startedAt) / 1000)
  const loggedSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  function pick(id: string) {
    store.addExercise(id)
    setShowExtras(false)
  }

  return (
    <div className="app" style={{ '--dc': DAY_COLOR[session.day] } as React.CSSProperties}>
      <header className="top">
        <button className="icon-btn" onClick={onExit} aria-label="Back — the workout stays open">
          <Icon name="arrowLeft" />
        </button>
        <div className="top__titles">
          <h1>{day?.label}</h1>
          <span className="eyebrow">
            {formatClock(elapsed)} elapsed · {plural(loggedSets, 'set')} logged
          </span>
        </div>
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
              day={session.day}
              def={def}
              sets={entry.sets}
              prev={store.state.seeds[entry.exerciseId] ?? []}
              members={members}
              onLogged={() => rest.start()}
            />
          )
        })}

        {available ? (
          <button className="btn block ghost" onClick={() => setShowExtras(true)}>
            <Icon name="plus" size={17} /> Add exercise · {available} available
          </button>
        ) : null}
      </div>

      <div className="actionbar">
        <div className="inner">
          <button className="btn success lg block" onClick={() => setConfirmFinish(true)}>
            <Icon name="check" size={18} /> Finish workout
          </button>
        </div>
      </div>

      {showExtras ? (
        <Sheet title="Add to today" onClose={() => setShowExtras(false)}>
          {skipped.length ? (
            <>
              <p className="section-title" style={{ marginTop: 0 }}>
                Skipped today
              </p>
              {skipped.map((d) => (
                <AddRow key={d.id} def={d} onPick={pick} />
              ))}
            </>
          ) : null}

          {extras.length ? (
            <>
              <p className="section-title">Extra work</p>
              {extras.map((d) => (
                <AddRow key={d.id} def={d} onPick={pick} />
              ))}
            </>
          ) : null}
        </Sheet>
      ) : null}

      {confirmFinish ? (
        <Sheet title="Finish workout?" onClose={() => setConfirmFinish(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
{plural(loggedSets, 'set')} logged. Unchecked sets are dropped, and today's numbers become the
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
                // Before anything else, while this tap still counts as one:
                // the backup that follows needs a live Google token, and the
                // old one has almost certainly expired during the workout.
                primeToken()
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

function AddRow({ def, onPick }: { def: ExerciseDef; onPick: (id: string) => void }) {
  const store = useStore()
  const prev = store.state.seeds[def.id] ?? []
  return (
    <button className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => onPick(def.id)}>
      <div style={{ fontWeight: 600 }}>{def.name}</div>
      <div className="small muted">{prev.length ? formatSets(prev, def) : 'No history yet'}</div>
    </button>
  )
}
