import { useMemo } from 'react'
import { FiArrowLeft, FiLink, FiMessageSquare } from 'react-icons/fi'
import { Link, useLocation, useParams } from 'react-router-dom'

import { claudePrompt, decodeShare, encodeShare, installPrompt, slugify } from '../../shared/core.js'
import { Command, CopyButton } from '../components/bits'
import { Mock } from '../components/Mock'
import { THEMES, config, entryOf, repoUrl, shellLine, shownMode } from '../lib/registry'
import type { Entry } from '../lib/registry'
import { useSite } from '../lib/site'

const SWATCHES = [
  ['s0', 'Page'],
  ['s1', 'Cards'],
  ['s2', 'Panels'],
  ['tp', 'Text'],
  ['tm', 'Muted'],
  ['accent-fill', 'Accent'],
  ['success', 'Success'],
  ['warning', 'Warning'],
  ['danger', 'Danger'],
  ['pro', 'Pro'],
] as const

function ThemeView({ entry, listed }: { entry: Entry; listed: boolean }) {
  const { mode } = useSite()
  const { theme } = entry
  const palette = entry.palettes[shownMode(entry, mode)]
  const shareUrl = listed
    ? `${location.origin}/theme/${entry.slug}`
    : `${location.origin}/s#${encodeShare(theme)}`

  if (!palette) return <NotFound />

  return (
    <article className="theme">
      <Link to="/" className="back">
        <FiArrowLeft /> All themes
      </Link>
      <header className="theme-head">
        <div>
          <h1>{theme.name}</h1>
          <p className="theme-by">
            by {theme.author}
            {entry.modes.length === 1 && <span className="badge is-inline">{entry.modes[0]} only</span>}
            {theme.scene && <span className="badge is-inline">moving backdrop</span>}
            {!listed && <span className="badge is-inline">shared by link</span>}
          </p>
          {theme.description && <p className="theme-desc">{theme.description}</p>}
        </div>
        <div className="theme-actions">
          <CopyButton text={shareUrl} icon={<FiLink />}>
            Copy link
          </CopyButton>
        </div>
      </header>

      <div className="theme-preview">
        <Mock palette={palette} scene={theme.scene} label={`${theme.name} in ${shownMode(entry, mode)} mode`} />
      </div>

      <div className="theme-cols">
        <section>
          <h2>Use this theme</h2>
          {listed ? (
            <>
              <p>Copy this and paste it into a chat in the Claude desktop app. Claude puts the theme on for you.</p>
              <CopyButton text={installPrompt(theme, entry.slug, config.repo)} className="button is-primary" icon={<FiMessageSquare />}>
                Copy for Claude
              </CopyButton>
              <details className="advanced">
                <summary>Or install it from a terminal</summary>
                <Command text={shellLine(entry.slug)} />
              </details>
            </>
          ) : (
            <>
              <p>
                Someone shared this theme with you by link. Copy this and paste it into a chat in the Claude
                desktop app, and Claude builds the theme from these exact colors:
              </p>
              <CopyButton text={claudePrompt(theme)} className="button is-primary" icon={<FiMessageSquare />}>
                Copy for Claude
              </CopyButton>
            </>
          )}
          <p className="fine">
            Themes change how the Claude desktop and mobile apps look. To go back, ask Claude to clear the
            theme.
          </p>
        </section>
        <section>
          <h2>Colors</h2>
          <div className="palette">
            {SWATCHES.map(([key, label]) => (
              <CopyButton key={key} text={palette[key]} className="chip" icon={<span style={{ background: palette[key] }} />}>
                <span>{label}</span>
                <code>{palette[key]}</code>
              </CopyButton>
            ))}
          </div>
          {listed && (
            <p className="fine">
              <a href={`${repoUrl}/blob/main/themes/${entry.slug}.json`}>View the theme file on GitHub</a>
            </p>
          )}
        </section>
      </div>
    </article>
  )
}

function NotFound() {
  return (
    <div className="empty">
      <p>That theme isn't here.</p>
      <Link to="/" className="button">
        <FiArrowLeft /> All themes
      </Link>
    </div>
  )
}

export function ThemePage() {
  const { slug } = useParams()
  const entry = THEMES.find(t => t.slug === slug)
  return entry ? <ThemeView key={entry.slug} entry={entry} listed /> : <NotFound />
}

/** A theme carried whole in the link: /s#<theme>. Nothing is fetched or stored. */
export function SharedPage() {
  const { hash } = useLocation()
  const entry = useMemo(() => {
    const theme = decodeShare(hash.slice(1))
    return theme ? entryOf(slugify(theme.name), theme) : null
  }, [hash])
  return entry ? <ThemeView key={hash} entry={entry} listed={false} /> : <NotFound />
}
