import { useRef, useState } from 'react'
import { plateBreakdown } from '../lib/calc'
import { useStore } from '../lib/state'
import { downloadBackup, freshState, readBackup } from '../lib/storage'
import { Icon } from './Icon'
import { NumberField, Toggle } from './ui'

export function SettingsView() {
  const store = useStore()
  const { prefs } = store.state
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<number | null>(60)
  const [status, setStatus] = useState<string | null>(null)

  const breakdown = target === null ? null : plateBreakdown(target, prefs.barWeight, prefs.plates)

  return (
    <div className="screen">
      <div className="section-title">Rest timer</div>
      <div className="card">
        <div className="setting">
          <label htmlFor="rest">
            Default rest
            <small>Starts automatically when you check a set off</small>
          </label>
          <input
            id="rest"
            type="number"
            inputMode="numeric"
            value={prefs.restSeconds}
            onChange={(e) => store.setPrefs({ restSeconds: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="setting">
          <label htmlFor="sound">Beep when rest ends</label>
          <Toggle on={prefs.soundOn} onChange={(v) => store.setPrefs({ soundOn: v })} />
        </div>
        <div className="setting">
          <label htmlFor="vib">Vibrate when rest ends</label>
          <Toggle on={prefs.vibrateOn} onChange={(v) => store.setPrefs({ vibrateOn: v })} />
        </div>
      </div>

      <div className="section-title">Progression</div>
      <div className="card">
        <div className="setting">
          <label>
            Rep ceiling
            <small>Clear this many reps and the app suggests going heavier</small>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={prefs.repCeiling}
            onChange={(e) => store.setPrefs({ repCeiling: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="setting">
          <label>
            Weight jump
            <small>Smallest increase you can actually make (kg)</small>
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={prefs.weightStep}
            onChange={(e) => store.setPrefs({ weightStep: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="section-title">Plate calculator</div>
      <div className="card">
        <div className="setting">
          <label>
            Target total
            <small>Bar {prefs.barWeight} kg · plates {prefs.plates.join(', ')}</small>
          </label>
          <div style={{ width: 110 }}>
            <NumberField value={target} onChange={setTarget} caption="kg" />
          </div>
        </div>
        {breakdown === null ? (
          <div className="small muted">Can't be made with these plates.</div>
        ) : breakdown.length === 0 ? (
          <div className="small muted">Empty bar.</div>
        ) : (
          <>
            <div className="small muted">Per side:</div>
            <div className="plate-vis">
              {breakdown.map((b) => (
                <span key={b.plate}>
                  {b.count} × {b.plate}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="setting" style={{ marginTop: 6 }}>
          <label>Bar weight</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={prefs.barWeight}
            onChange={(e) => store.setPrefs({ barWeight: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="setting">
          <label>
            Plates
            <small>Comma separated, per side</small>
          </label>
          <input
            type="text"
            style={{ width: 150 }}
            defaultValue={prefs.plates.join(', ')}
            onBlur={(e) =>
              store.setPrefs({
                plates: e.target.value
                  .split(',')
                  .map((v) => Number(v.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0),
              })
            }
          />
        </div>
      </div>

      <div className="section-title">Your data</div>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          Everything lives on this phone only. Back it up now and then — clearing your browser data
          wipes it.
        </p>
        <button className="btn block" onClick={() => downloadBackup(store.state)}>
          <Icon name="download" size={17} /> Export backup
        </button>
        <button className="btn block" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={17} /> Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              store.replaceState(await readBackup(file))
              setStatus('Backup restored.')
            } catch {
              setStatus("That file didn't look like a workout backup.")
            }
            e.target.value = ''
          }}
        />
        <button
          className="btn block"
          style={{ marginTop: 8 }}
          onClick={() => {
            store.reloadNotes()
            setStatus('Reloaded exercises from notes. Your logged sets are untouched.')
          }}
        >
          <Icon name="refresh" size={17} /> Reload exercises from notes
        </button>
        <button
          className="btn block danger"
          style={{ marginTop: 8 }}
          onClick={() => {
            if (confirm('Erase every saved workout and start over? Export a backup first.')) {
              store.replaceState(freshState())
              setStatus('Everything reset.')
            }
          }}
        >
          <Icon name="trash" size={17} /> Erase all data
        </button>
        {status ? (
          <p className="small" style={{ color: 'var(--success)' }}>
            {status}
          </p>
        ) : null}
      </div>

      <p className="tiny muted" style={{ textAlign: 'center' }}>
        {store.state.catalog.length} exercises · {store.state.sessions.length} saved workouts
      </p>
    </div>
  )
}
