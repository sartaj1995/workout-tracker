import { useState } from 'react'
import { Home } from './components/Home'
import { HistoryView } from './components/HistoryView'
import { ProgressView } from './components/ProgressView'
import { RestBar } from './components/RestBar'
import { SessionView } from './components/SessionView'
import { SettingsView } from './components/SettingsView'
import { useStore } from './lib/state'
import { useRestTimer } from './lib/useRestTimer'
import type { DayId } from './lib/types'

type Tab = 'home' | 'history' | 'progress' | 'settings'

const TABS: { id: Tab; glyph: string; label: string }[] = [
  { id: 'home', glyph: '🏋️', label: 'Train' },
  { id: 'history', glyph: '📅', label: 'History' },
  { id: 'progress', glyph: '📈', label: 'Progress' },
  { id: 'settings', glyph: '⚙️', label: 'Settings' },
]

const TITLES: Record<Tab, string> = {
  home: 'Workout',
  history: 'History',
  progress: 'Progress',
  settings: 'Settings',
}

export function App() {
  const store = useStore()
  const rest = useRestTimer(store.state.prefs)
  const [tab, setTab] = useState<Tab>('home')
  const [inSession, setInSession] = useState(false)

  function start(day: DayId) {
    if (store.state.active && store.state.active.day !== day) {
      if (!confirm(`A ${store.state.active.day} workout is still open. Start ${day} instead?`)) return
    }
    if (!store.state.active || store.state.active.day !== day) store.startSession(day)
    setInSession(true)
  }

  if (inSession && store.state.active) {
    return (
      <>
        <SessionView rest={rest} onExit={() => setInSession(false)} />
        <RestBar rest={rest} />
      </>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <h1>{TITLES[tab]}</h1>
      </header>

      {tab === 'home' ? <Home onStart={start} onResume={() => setInSession(true)} /> : null}
      {tab === 'history' ? <HistoryView /> : null}
      {tab === 'progress' ? <ProgressView /> : null}
      {tab === 'settings' ? <SettingsView /> : null}

      <RestBar rest={rest} />

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="glyph">{t.glyph}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
