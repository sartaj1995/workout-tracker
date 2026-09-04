import { useMemo, useState } from 'react'
import { plural } from '../lib/calc'
import { planNotesChange, type NotesChange } from '../lib/notesEdit'
import { effectiveNotes } from '../lib/storage'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { Sheet } from './ui'

const NEW = '__new__'

/**
 * Editing your notes without a deploy.
 *
 * The notes are still one block of text rather than a form of exercise rows —
 * it's the shape you already write them in, and a form would be slower for the
 * thing this is actually for: adding a line at the gym.
 *
 * What a deploy used to provide, and this has to replace, is the pause before
 * it counts: a diff to look at, and the chance to notice something went wrong.
 * Hence the running summary underneath, and the review step on save.
 */
export function NotesEditor({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [text, setText] = useState(() => effectiveNotes(store.state))
  const [review, setReview] = useState<NotesChange | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const change = useMemo(() => planNotesChange(store.state, text), [store.state, text])
  const edited = store.state.notes !== undefined
  const dirty = text !== effectiveNotes(store.state)
  const planned = change.counts.reduce((n, c) => n + c.core + c.extra, 0)

  function save() {
    // Nothing appeared and nothing vanished: no rename is possible, so there's
    // nothing to ask about.
    if (change.added.length === 0 && change.removed.length === 0) {
      store.saveNotes(text, {})
      onClose()
      return
    }
    setReview(change)
  }

  return (
    <Sheet title="Your exercises" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        The same notes format as always. A day heading, then{' '}
        <code>Name - 80x9 75x8</code> for each exercise. Add <code>s</code> to the numbers for a
        timed hold (<code>110s</code>), and <code>plate</code> in front of the sets for a machine
        numbered by pin rather than kilos.
      </p>

      <textarea
        className="notes-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />

      <div className="notes-summary">
        {change.counts.map((c) => (
          <span key={c.day} className={c.core + c.extra ? '' : 'muted'}>
            {c.label} {c.core}
            {c.extra ? ` +${c.extra}` : ''}
          </span>
        ))}
      </div>

      {change.warnings.length ? (
        <div className="banner" style={{ alignItems: 'flex-start' }}>
          <Icon name="alert" size={16} />
          <span>
            {change.warnings.map((w, i) => (
              <span key={i} style={{ display: 'block', marginBottom: 2 }}>
                {w}
              </span>
            ))}
          </span>
        </div>
      ) : null}

      {planned === 0 ? (
        <p className="tiny muted">
          Nothing parsed. Check the day headings — they have to read exactly Push, Pull, Legs or
          Upper.
        </p>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="spacer" />
        <button className="btn primary" disabled={!dirty || planned === 0} onClick={save}>
          Review changes
        </button>
      </div>

      {edited ? (
        <button
          className="btn block ghost"
          style={{ marginTop: 14 }}
          onClick={() => setConfirmReset(true)}
        >
          <Icon name="refresh" size={16} /> Go back to the notes in the app build
        </button>
      ) : null}

      {review ? (
        <ReviewChanges
          change={review}
          text={text}
          onDone={() => {
            setReview(null)
            onClose()
          }}
          onBack={() => setReview(null)}
        />
      ) : null}

      {confirmReset ? (
        <Sheet title="Back to the built-in notes?" onClose={() => setConfirmReset(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Your edits are dropped and the exercises go back to the ones shipped with the app.
            Nothing you've logged is touched — anything that disappears is retired, keeping its
            history and its chart.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>
              Keep my edits
            </button>
            <div className="spacer" />
            <button
              className="btn danger"
              onClick={() => {
                store.resetNotes()
                setConfirmReset(false)
                onClose()
              }}
            >
              Use the built-in notes
            </button>
          </div>
        </Sheet>
      ) : null}
    </Sheet>
  )
}

/**
 * The step a deploy used to be.
 *
 * Every arrival is asked about, because an exercise arriving at the same time
 * as one disappears is far more often a rename than a coincidence — and a
 * rename answered wrong strands a history on a name you can't see any more.
 */
function ReviewChanges({
  change,
  text,
  onDone,
  onBack,
}: {
  change: NotesChange
  text: string
  onDone: () => void
  onBack: () => void
}) {
  const store = useStore()
  const [links, setLinks] = useState<Record<string, string>>(() => ({ ...change.suggested }))

  const takenBy = (removedId: string) =>
    Object.entries(links).find(([, v]) => v === removedId)?.[0] ?? null

  const retiring = change.removed.filter((r) => !takenBy(r.def.id))
  const renamed = change.added.filter((a) => links[a.id] && links[a.id] !== NEW)

  function apply() {
    const renames: Record<string, string> = {}
    for (const a of change.added) {
      const to = links[a.id]
      if (to && to !== NEW) renames[a.id] = to
    }
    store.saveNotes(text, renames)
    onDone()
  }

  return (
    <Sheet title="Before this counts" onClose={onBack}>
      {change.added.length ? (
        <>
          <p className="section-title" style={{ marginTop: 0 }}>
            New in your notes
          </p>
          {change.added.map((a) => (
            <div className="rename-row" key={a.id}>
              <div className="rename-row__name">{a.name}</div>
              <select
                value={links[a.id] ?? NEW}
                onChange={(e) => setLinks((prev) => ({ ...prev, [a.id]: e.target.value }))}
              >
                <option value={NEW}>Something new — start from zero</option>
                {change.removed.map((r) => (
                  <option key={r.def.id} value={r.def.id}>
                    Renamed from {r.def.name}
                    {r.sessions ? ` · ${plural(r.sessions, 'workout')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {change.removed.length ? (
            <p className="tiny muted">
              Pick the old name and everything logged under it comes with the new one — history,
              chart, best, and how it's measured. Get this wrong and the old numbers stay stranded
              on a name you can't see any more.
            </p>
          ) : null}
        </>
      ) : null}

      {renamed.length ? (
        <div className="banner" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
          <Icon name="check" size={16} />
          <span>
            {renamed.length === 1
              ? '1 exercise keeps its history under the new name.'
              : `${renamed.length} exercises keep their history under their new names.`}
          </span>
        </div>
      ) : null}

      {retiring.length ? (
        <>
          <p className="section-title">No longer in your notes</p>
          <div className="list-card">
            {retiring.map((r) => (
              <div className="preview-item" key={r.def.id}>
                <span className="preview-item__num">
                  <Icon name="alert" size={13} />
                </span>
                <span className="preview-item__body">
                  <span className="preview-item__name">{r.def.name}</span>
                  <span className="preview-item__sets">
                    {r.sessions
                      ? `${plural(r.sessions, 'workout')} kept — retired, not deleted`
                      : 'Never logged — nothing to keep'}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="tiny muted">
            Retired exercises stop being offered in new workouts. Their history and charts stay,
            and putting the name back brings them straight back.
          </p>
        </>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onBack}>
          Back to editing
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={apply}>
          Save notes
        </button>
      </div>
    </Sheet>
  )
}
