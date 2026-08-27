import { useState } from 'react'
import { formatSets, plural, relativeDay } from '../lib/calc'
import { resolveDay } from '../lib/plan'
import { useStore } from '../lib/store'
import { DAY_COLOR } from '../lib/theme'
import type { DayId } from '../lib/types'
import { DAYS } from '../data/parse'
import { Icon } from './Icon'
import { Sheet } from './ui'

/**
 * Read-only look at a day before committing to it. Opening a day costs
 * nothing — no session is created and no existing session is touched until
 * "Start workout" is tapped.
 */
export function DayPreview({
  day,
  onBack,
  onEnterSession,
}: {
  day: DayId
  onBack: () => void
  onEnterSession: () => void
}) {
  const store = useStore()
  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const { active, sessions } = store.state

  const meta = DAYS.find((d) => d.id === day)
  const core = resolveDay(store.state, day, false)
  const extras = resolveDay(store.state, day, true)
  const last = sessions.find((s) => s.day === day)

  const activeHere = active?.day === day
  const activeElsewhere = active && active.day !== day
  const otherLabel = DAYS.find((d) => d.id === active?.day)?.label
  // A day whose heading exists in the notes but has nothing under it yet.
  const empty = core.length === 0 && extras.length === 0
  const bottomPad = empty ? undefined : 'calc(120px + var(--safe-b))'

  function start() {
    store.startSession(day)
    onEnterSession()
  }

  return (
    <div className="app" style={{ '--dc': DAY_COLOR[day] } as React.CSSProperties}>
      <header className="top">
        <button className="icon-btn" onClick={onBack} aria-label="Back to home">
          <Icon name="arrowLeft" />
        </button>
        <div className="top__titles">
          <h1>{meta?.label}</h1>
          <span className="eyebrow">
            {empty ? 'Not set up yet' : plural(core.length, 'exercise')}
            {!empty && extras.length ? ` · ${extras.length} extra` : ''}
            {!empty && last ? ` · last ${relativeDay(last.startedAt)}` : ''}
          </span>
        </div>
      </header>

      <div className="screen" style={{ paddingBottom: bottomPad }}>
        {activeHere ? (
          <div className="banner" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
            <Icon name="timer" size={16} />
            <span>This workout is already in progress — pick up where you left off.</span>
          </div>
        ) : null}

        {activeElsewhere ? (
          <div className="banner">
            <Icon name="timer" size={16} />
            <span>
              A {otherLabel} workout is still open. Starting {meta?.label} will discard it.
            </span>
          </div>
        ) : null}

        {empty ? (
          <p className="empty">
            Nothing here yet. Add your {meta?.label.toLowerCase()} exercises under the{' '}
            <strong>{meta?.label}</strong> heading in <code>src/data/notes.ts</code>, redeploy, and
            they'll show up — same format as the other days.
          </p>
        ) : null}

        {empty ? null : <p className="section-title">The session</p>}
        {empty ? null : (
          <div className="list-card">
            {core.map((def, i) => {
              const members = def.choiceId
                ? store.state.catalog.filter((d) => d.choiceId === def.choiceId)
                : []
              const prev = store.state.seeds[def.id] ?? []
              return (
                <div className="preview-item" key={def.id}>
                  <span className="preview-item__num">{i + 1}</span>
                  <span className="preview-item__body">
                    <span className="preview-item__name">{def.name}</span>
                    <span className="preview-item__sets">
                      {prev.length ? formatSets(prev, def) : 'No history yet'}
                    </span>
                    {members.length > 1 ? (
                      <span className="preview-item__alt">
                        or{' '}
                        {members
                          .filter((m) => m.id !== def.id)
                          .map((m, j, arr) => (
                            <span key={m.id}>
                              <button
                                className="linkish"
                                onClick={() => store.swapChoice(day, def.choiceId!, m.id)}
                              >
                                {m.name}
                              </button>
                              {j < arr.length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                      </span>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {extras.length ? (
          <>
            <p className="section-title">Extra work · optional</p>
            <div className="list-card">
              {extras.map((def) => {
                const prev = store.state.seeds[def.id] ?? []
                return (
                  <div className="preview-item" key={def.id}>
                    <span className="preview-item__num">
                      <Icon name="plus" size={13} />
                    </span>
                    <span className="preview-item__body">
                      <span className="preview-item__name">{def.name}</span>
                      <span className="preview-item__sets">
                        {prev.length ? formatSets(prev, def) : 'No history yet'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="tiny muted" style={{ textAlign: 'center' }}>
              Add any of these from inside the session.
            </p>
          </>
        ) : null}
      </div>

      {empty ? null : (
        <div className="actionbar">
          <div className="inner">
            {activeHere ? (
              <button className="btn success lg block" onClick={onEnterSession}>
                <Icon name="play" size={18} filled /> Resume workout
              </button>
            ) : (
              <button
                className="btn primary lg block"
                onClick={() => (activeElsewhere ? setConfirmSwitch(true) : start())}
              >
                <Icon name="play" size={18} filled /> Start workout
              </button>
            )}
          </div>
        </div>
      )}

      {confirmSwitch ? (
        <Sheet title={`Discard the ${otherLabel} workout?`} onClose={() => setConfirmSwitch(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Your {otherLabel} session has{' '}
            {plural(
              active?.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0) ?? 0,
              'set',
            )}{' '}
            logged. Starting {meta?.label} throws that away.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmSwitch(false)}>
              Keep it
            </button>
            <div className="spacer" />
            <button
              className="btn danger"
              onClick={() => {
                setConfirmSwitch(false)
                start()
              }}
            >
              Discard and start {meta?.label}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
