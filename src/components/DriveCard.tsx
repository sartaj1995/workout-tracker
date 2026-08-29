import { useEffect, useState } from 'react'
import { NEEDS_SIGN_IN, driveConfigured, primeToken } from '../lib/drive'
import { useStore } from '../lib/store'
import { backUp, disconnect, loadSync, restore, type SyncRecord } from '../lib/sync'
import { Icon } from './Icon'
import { Sheet } from './ui'

const when = (ts?: number) => (ts ? new Date(ts).toLocaleString() : 'never')

export function DriveCard() {
  const store = useStore()
  const [sync, setSync] = useState<SyncRecord>(loadSync)
  const [busy, setBusy] = useState<null | 'backup' | 'restore'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  // Another tab (or the auto-backup after a workout) can move this on.
  useEffect(() => {
    const id = setInterval(() => setSync(loadSync()), 4000)
    return () => clearInterval(id)
  }, [])

  if (!driveConfigured) {
    return (
      <>
        <div className="section-title">Google Drive backup</div>
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>
            Not set up for this build. Add a <code>VITE_GOOGLE_CLIENT_ID</code> environment
            variable in Vercel and redeploy — the README has the steps.
          </p>
        </div>
      </>
    )
  }

  async function runBackup(force = false, interactive = false) {
    if (interactive) primeToken()
    setBusy('backup')
    setError(null)
    setMessage(null)
    const result = await backUp(store.state, { interactive, force })
    setBusy(null)
    setSync(loadSync())
    if (result.ok) setMessage('Backed up to Drive.')
    else if (result.reason === 'conflict') setError(null)
    else setError(result.message)
  }

  async function runRestore() {
    setBusy('restore')
    setError(null)
    setMessage(null)
    const result = await restore(true)
    setBusy(null)
    setSync(loadSync())
    if (result.ok) {
      store.replaceState(result.state)
      setMessage('Restored from Drive.')
    } else {
      setError(result.message)
    }
  }

  return (
    <>
      <div className="section-title">Google Drive backup</div>
      <div className="card">
        {sync.connected ? (
          <>
            <div className="row" style={{ marginBottom: 'var(--s-3)' }}>
              <Icon name="cloud" size={18} />
              <span className="small">
                Connected
                <br />
                <span className="muted tiny">Last synced {when(sync.lastSyncedAt)}</span>
              </span>
            </div>

            {sync.lastError && !sync.conflict ? (
              <div className="banner">
                <Icon name="alert" size={16} />
                <span>
                  {sync.lastError === NEEDS_SIGN_IN
                    ? "Google's sign-in lasts an hour, and this one has run out. Back up now renews it and sends the last workout up."
                    : `Last backup didn't go through: ${sync.lastError}`}
                </span>
              </div>
            ) : null}

            {sync.conflict ? (
              <div className="banner">
                <Icon name="alert" size={16} />
                <span>
                  {sync.conflictFirstConnect
                    ? `Drive already has a backup from ${when(Date.parse(sync.conflictRemoteTime ?? ''))}, made on another device. Nothing has been overwritten — restore it here, or replace it with this device's data.`
                    : `Drive holds a copy this device hasn't seen, from ${when(Date.parse(sync.conflictRemoteTime ?? ''))} — probably logged elsewhere. Nothing has been overwritten. Pick which one to keep.`}
                </span>
              </div>
            ) : null}

            {/* On a conflict the safe move is to pull, so it leads. */}
            {(sync.conflict ? ['restore', 'backup'] : ['backup', 'restore']).map((action, i) => (
              <div key={action} style={i > 0 ? { marginTop: 8 } : undefined}>
                {action === 'restore' ? (
                  <button
                    className={`btn block${sync.conflict ? ' primary' : ''}`}
                    disabled={busy !== null}
                    onClick={() => setConfirmRestore(true)}
                  >
                    <Icon name="download" size={17} />
                    {busy === 'restore' ? 'Restoring…' : 'Restore from Drive'}
                  </button>
                ) : (
                  <button
                    className="btn block"
                    disabled={busy !== null}
                    onClick={() => runBackup(sync.conflict === true, true)}
                  >
                    <Icon name="upload" size={17} />
                    {busy === 'backup'
                      ? 'Backing up…'
                      : sync.conflict
                        ? "Replace Drive with this device's data"
                        : 'Back up now'}
                  </button>
                )}
              </div>
            ))}

            <button
              className="btn block ghost"
              style={{ marginTop: 8 }}
              onClick={() => {
                disconnect()
                setSync(loadSync())
                setMessage('Disconnected. Your Drive file is untouched.')
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Keeps one backup file in your own Drive, and re-uploads it after every workout you
              save. It can only see the file it created — none of your other Drive files.
            </p>
            <button className="btn block primary" disabled={busy !== null} onClick={() => runBackup(false, true)}>
              <Icon name="cloud" size={17} /> {busy ? 'Connecting…' : 'Connect Google Drive'}
            </button>
          </>
        )}

        {message ? (
          <p className="small" style={{ color: 'var(--success)', marginBottom: 0 }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="small" style={{ color: 'var(--danger)', marginBottom: 0 }}>
            {error}
          </p>
        ) : null}
      </div>

      {confirmRestore ? (
        <Sheet title="Restore from Drive?" onClose={() => setConfirmRestore(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            This replaces everything on this phone with Drive's copy — {store.state.sessions.length}{' '}
            saved workouts here will be dropped. Export a file backup first if you're unsure.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmRestore(false)}>
              Cancel
            </button>
            <div className="spacer" />
            <button
              className="btn danger"
              onClick={() => {
                setConfirmRestore(false)
                void runRestore()
              }}
            >
              Replace with Drive's copy
            </button>
          </div>
        </Sheet>
      ) : null}
    </>
  )
}
