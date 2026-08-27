import { useEffect, useRef, useState } from 'react'
import { DayPreview } from './components/DayPreview'
import { Home } from './components/Home'
import { HistoryView } from './components/HistoryView'
import { Icon, type IconName } from './components/Icon'
import { ProgressView } from './components/ProgressView'
import { RestBar } from './components/RestBar'
import { SessionView } from './components/SessionView'
import { SettingsView } from './components/SettingsView'
import { useStore } from './lib/store'
import { backUp, loadSync, markPending } from './lib/sync'
import { useBackupRetry } from './lib/useBackupRetry'
import { useRestTimer } from './lib/useRestTimer'
import type { DayId } from './lib/types'

type Tab = 'home' | 'history' | 'progress' | 'settings'

const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'home', icon: 'dumbbell', label: 'Train' },
  { id: 'history', icon: 'calendar', label: 'History' },
  { id: 'progress', icon: 'trending', label: 'Progress' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
]

const TITLES: Record<Tab, string> = {
  home: 'Workout',
  history: 'History',
  progress: 'Progress',
  settings: 'Settings',
}

/** home -> preview -> session. Back always pops exactly one level. */
type View = 'tabs' | 'preview' | 'session'

export function App() {
  const store = useStore()
  const rest = useRestTimer(store.state.prefs)
  const [tab, setTab] = useState<Tab>('home')
  const [view, setView] = useState<View>('tabs')
  const [day, setDay] = useState<DayId>('push')

  // A saved workout is the moment worth protecting, so record the debt first
  // and then try to push it. Recording first matters: the attempt is usually
  // made in a gym with no signal, and the debt is what gets it retried later.
  const savedCount = store.state.sessions.length
  const lastSeenCount = useRef(savedCount)
  useEffect(() => {
    if (savedCount <= lastSeenCount.current) {
      lastSeenCount.current = savedCount
      return
    }
    lastSeenCount.current = savedCount
    if (!loadSync().connected) return
    markPending()
    void backUp(store.state)
  }, [savedCount, store.state])

  useBackupRetry(store.state)

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  if (view === 'session' && store.state.active) {
    return (
      <>
        <SessionView rest={rest} onExit={() => setView('preview')} />
        <RestBar rest={rest} />
      </>
    )
  }

  if (view === 'preview') {
    return (
      <>
        <DayPreview day={day} onBack={() => setView('tabs')} onEnterSession={() => setView('session')} />
        <RestBar rest={rest} />
      </>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <div className="top__titles">
          {tab === 'home' ? <span className="eyebrow">{today}</span> : null}
          <h1>{TITLES[tab]}</h1>
        </div>
      </header>

      {tab === 'home' ? (
        <Home
          onOpenDay={(d) => {
            setDay(d)
            setView('preview')
          }}
          onResume={() => {
            if (store.state.active) setDay(store.state.active.day)
            setView('session')
          }}
        />
      ) : null}
      {tab === 'history' ? <HistoryView /> : null}
      {tab === 'progress' ? <ProgressView /> : null}
      {tab === 'settings' ? <SettingsView /> : null}

      <RestBar rest={rest} />

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
