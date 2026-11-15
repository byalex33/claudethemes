import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { Mode } from '../../shared/core.js'

type Site = {
  mode: Mode
  setMode: (mode: Mode) => void
}

const SiteContext = createContext<Site | null>(null)

function firstMode(): Mode {
  try {
    const saved = localStorage.getItem('mode')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage can be blocked; fall through to the system setting.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(firstMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  const site = useMemo<Site>(
    () => ({
      mode,
      setMode: next => {
        setModeState(next)
        try {
          localStorage.setItem('mode', next)
        } catch {
          // Not remembered, and that's fine.
        }
      },
    }),
    [mode],
  )

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>
}

export function useSite(): Site {
  const site = useContext(SiteContext)
  if (!site) throw new Error('useSite outside SiteProvider')
  return site
}
