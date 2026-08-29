import { useEffect, useState } from 'react'
import { relativeDay } from '../lib/calc'
import { useStore } from '../lib/store'
import { NEEDS_SIGN_IN, primeToken } from '../lib/drive'
import { backUp, loadSync, type SyncRecord } from '../lib/sync'
import { Icon } from './Icon'

/**
 * Says out loud when a workout hasn't reached Drive yet.
 *
 * Previously this only showed in Settings, so a backup could quietly stop
 * working and you'd find out when you needed it. The retry is interactive
 * because the failure is sometimes an expired sign-in, which needs a tap.
 */
export function BackupNudge() {
  const store = useStore()
  const [sync, setSync] = useState<SyncRecord>(loadSync)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setSync(loadSync()), 3000)
    return () => clearInterval(id)
  }, [])

  if (!sync.connected || !sync.pendingSince || sync.conflict) return null

  return (
    <div className="banner" style={{ alignItems: 'center' }}>
      <Icon name="alert" size={16} />
      <span style={{ flex: 1 }}>
        Last workout isn't in Drive yet — saved {relativeDay(sync.pendingSince)}.
        {sync.lastError && sync.lastError !== NEEDS_SIGN_IN ? ` ${sync.lastError}` : ''}
      </span>
      <button
        className="chip"
        disabled={busy}
        onClick={async () => {
          primeToken()
          setBusy(true)
          await backUp(store.state, { interactive: true })
          setBusy(false)
          setSync(loadSync())
        }}
      >
        {busy ? 'Trying…' : sync.lastError === NEEDS_SIGN_IN ? 'Sign in' : 'Retry'}
      </button>
    </div>
  )
}
