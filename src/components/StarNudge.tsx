import { useEffect, useState } from 'react'
import { FiStar, FiX } from 'react-icons/fi'

import { repoUrl } from '../lib/registry'

const KEY = 'star-nudge-closed'

function closedBefore(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** A small note in the corner asking for a GitHub star. Shows once, a moment after arriving. */
export function StarNudge() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (closedBefore()) return
    const timer = setTimeout(() => setShown(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const close = () => {
    setShown(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // Not remembered, so it may show again next visit. That's fine.
    }
  }

  if (!shown) return null

  return (
    <aside className="nudge" aria-label="Star us on GitHub">
      <button type="button" className="icon-button nudge-close" aria-label="Dismiss" onClick={close}>
        <FiX />
      </button>
      <p className="nudge-title">Psst. We're open source.</p>
      <p className="nudge-text">No ads, no accounts, no catch. If you like it, a star makes our day.</p>
      <a className="button is-primary" href={repoUrl} target="_blank" rel="noreferrer" onClick={close}>
        <FiStar /> Star us on GitHub
      </a>
    </aside>
  )
}
