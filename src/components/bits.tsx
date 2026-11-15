import { useState } from 'react'
import type { ReactNode } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import type { Mode } from '../../shared/core.js'
import { paletteFor, shownMode } from '../lib/registry'
import type { Entry } from '../lib/registry'
import { Mock } from './Mock'

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function CopyButton({
  text,
  children,
  className = 'button',
  icon,
  disabled,
}: {
  text: string
  children?: ReactNode
  className?: string
  icon?: ReactNode
  disabled?: boolean
}) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={children ? undefined : 'Copy'}
      onClick={async () => {
        setState((await copy(text)) ? 'done' : 'failed')
        setTimeout(() => setState('idle'), 1600)
      }}
    >
      {state === 'done' ? <FiCheck /> : (icon ?? <FiCopy />)}
      {state === 'failed' ? 'Copy failed' : state === 'done' && children ? 'Copied' : children}
    </button>
  )
}

export function Command({ text }: { text: string }) {
  return (
    <div className="command">
      <code>{text}</code>
      <CopyButton text={text} className="icon-button" />
    </div>
  )
}

export function ThemeCard({ entry, mode }: { entry: Entry; mode: Mode }) {
  const palette = paletteFor(entry, mode)
  if (!palette) return null
  const only = entry.modes.length === 1 ? shownMode(entry, mode) : null

  return (
    <Link to={`/theme/${entry.slug}`} className="card">
      <Mock palette={palette} scene={entry.theme.scene} label={`${entry.theme.name} preview`} />
      <div className="card-meta">
        <div>
          <div className="card-name">{entry.theme.name}</div>
          <div className="card-author">by {entry.theme.author}</div>
        </div>
        <div className="swatches" aria-hidden="true">
          {(['accent-fill', 'success', 'warning', 'danger', 'pro'] as const).map(key => (
            <span key={key} style={{ background: palette[key] }} />
          ))}
        </div>
      </div>
      <span className="badges">
        {entry.theme.scene && <span className="badge">moving</span>}
        {only && <span className="badge">{only} only</span>}
      </span>
    </Link>
  )
}
