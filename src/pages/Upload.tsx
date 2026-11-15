import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { FiAlertTriangle, FiCheck, FiDownload, FiGithub, FiLink, FiMessageSquare, FiUploadCloud, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { EXPORT_PROMPT, SHARE_MAX, clean, compile, encodeShare, modesOf, paletteOf, parsePasted, slugify } from '../../shared/core.js'
import type { Mode, Theme } from '../../shared/core.js'
import { CopyButton } from '../components/bits'
import { Mock } from '../components/Mock'
import { THEMES, config, repoUrl, submitUrl } from '../lib/registry'
import { useSite } from '../lib/site'

const FILE_MAX = 200_000
// GitHub drops a prefilled file that makes the address too long.
const PREFILL_MAX = 6500
const ENDPOINT = '/api/upload'

type Sent = { state: 'idle' } | { state: 'sending' } | { state: 'sent'; url?: string } | { state: 'failed'; message: string }

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function Upload() {
  const site = useSite()
  const input = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [over, setOver] = useState(false)
  const [sent, setSent] = useState<Sent>({ state: 'idle' })
  // Whether the site can queue an upload itself. If not, GitHub takes it.
  const [direct, setDirect] = useState(false)

  useEffect(() => {
    let live = true
    fetch(ENDPOINT)
      .then(r => (r.ok ? r.json() : { ready: false }))
      .then((body: { ready?: boolean }) => live && setDirect(body.ready === true))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const take = (text: string) => {
    setSent({ state: 'idle' })
    if (text.length > FILE_MAX) {
      setRaw(null)
      setProblem('That file is too big to be a theme.')
      return
    }
    const parsed = parsePasted(text)
    if (!parsed) {
      setRaw(null)
      setProblem("That isn't a theme file. It should be the JSON Claude gave you.")
      return
    }
    setProblem(null)
    setRaw(parsed)
    setName(typeof parsed.name === 'string' ? parsed.name : '')
    setAuthor(typeof parsed.author === 'string' ? parsed.author : '')
  }

  const takeFile = async (file: File | undefined) => {
    if (file) take(await file.text())
  }

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void takeFile(e.dataTransfer.files[0])
  }

  const theme = useMemo(() => (raw ? clean({ ...(raw as Theme), name, author }) : null), [raw, name, author])
  const result = useMemo(
    () => (raw ? compile({ ...raw, name: name.trim(), author: author.trim() } as Theme) : null),
    [raw, name, author],
  )
  const shown: Mode | null = theme ? (modesOf(theme).includes(site.mode) ? site.mode : (modesOf(theme)[0] ?? null)) : null
  // The preview doesn't wait for a name and an author: it shows as soon as the colors are good.
  const draft = useMemo(
    () => (raw ? compile({ ...raw, name: name.trim() || 'Untitled', author: author.trim() || 'you' } as Theme) : null),
    [raw, name, author],
  )
  const palette = draft && shown ? paletteOf(draft.colors, shown) : null
  const slug = slugify(name)
  const taken = THEMES.some(t => t.slug === slug)
  const ready = Boolean(theme && result && result.errors.length === 0 && result.blocking.length === 0)
  const file = theme ? `${JSON.stringify(theme, null, 2)}\n` : ''
  const share = theme && ready ? encodeShare(theme) : ''
  const prefill = theme && ready ? submitUrl(slug, theme) : ''

  const send = async () => {
    if (!theme) return
    setSent({ state: 'sending' })
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'The upload was refused.')
      setSent({ state: 'sent', url: body.url })
    } catch (error) {
      setSent({ state: 'failed', message: error instanceof Error ? error.message : 'The upload failed.' })
    }
  }

  return (
    <div className="upload">
      <header className="upload-head">
        <h1>Upload your theme</h1>
        <p className="lede">
          Made a theme you love in the Claude desktop app? Put it in the gallery, or send it to a friend with a
          link. No account needed.
        </p>
      </header>

      <ol className="upload-steps">
        <li>
          <h2>Get your theme out of Claude</h2>
          <p>In the chat where Claude made your theme, paste this. Claude replies with your theme as a small file of colors.</p>
          <CopyButton text={EXPORT_PROMPT} className="button" icon={<FiMessageSquare />}>
            Copy the export prompt
          </CopyButton>
        </li>

        <li>
          <h2>Drop it here</h2>
          <div
            className={`drop${over ? ' is-over' : ''}`}
            onDragOver={e => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
          >
            <FiUploadCloud aria-hidden="true" />
            <p>
              Drag a theme file here, or{' '}
              <button type="button" className="link" onClick={() => input.current?.click()}>
                choose a file
              </button>
            </p>
            <input ref={input} type="file" accept=".json,application/json,text/plain" hidden onChange={e => void takeFile(e.target.files?.[0])} />
            <textarea
              placeholder="or paste what Claude replied"
              aria-label="Paste your theme"
              rows={3}
              spellCheck={false}
              onPaste={e => {
                e.preventDefault()
                take(e.clipboardData.getData('text'))
              }}
              onChange={e => take(e.target.value)}
              value=""
            />
          </div>
          {problem && (
            <p className="check is-bad">
              <FiAlertTriangle /> {problem}
            </p>
          )}
        </li>

        {raw && result && (
          <li>
            <h2>Check it and send it</h2>
            <div className="upload-review">
              <div className="upload-fields">
                <label className="field">
                  <span>Theme name</span>
                  <input value={name} maxLength={40} onChange={e => setName(e.target.value)} />
                </label>
                <label className="field">
                  <span>Your name or handle</span>
                  <input value={author} maxLength={39} placeholder="How you want to be credited" onChange={e => setAuthor(e.target.value)} />
                </label>

                <section className="checks" aria-live="polite">
                  {result.errors.map(line => (
                    <p key={line} className="check is-bad">
                      <FiAlertTriangle /> {line}
                    </p>
                  ))}
                  {result.blocking.length > 0 && (
                    <details className="check is-bad" open>
                      <summary>
                        <FiAlertTriangle /> Claude won't paint this theme: {result.blocking.length} places where text is too hard to read
                      </summary>
                      <ul>
                        {result.blocking.slice(0, 6).map(line => (
                          <li key={line}>{line.replace(/^Desktop won't paint this theme, because /, '')}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {ready && (
                    <p className="check is-good">
                      <FiCheck /> This theme checks out{theme?.scene ? ', moving backdrop included' : ''}.
                    </p>
                  )}
                  {ready && taken && (
                    <p className="check is-bad">
                      <FiAlertTriangle /> The gallery already has a theme called {name}. Change the name to upload it.
                    </p>
                  )}
                </section>

                <div className="share-actions">
                  {direct ? (
                    <button type="button" className="button is-primary" disabled={!ready || taken || sent.state === 'sending' || sent.state === 'sent'} onClick={() => void send()}>
                      <FiUploadCloud /> {sent.state === 'sending' ? 'Uploading' : 'Upload to the gallery'}
                    </button>
                  ) : prefill.length <= PREFILL_MAX ? (
                    <a className={`button is-primary${ready && !taken ? '' : ' is-disabled'}`} href={ready && !taken ? prefill : undefined} target="_blank" rel="noreferrer" aria-disabled={!ready || taken}>
                      <FiGithub /> Upload to the gallery
                    </a>
                  ) : (
                    <>
                      <button type="button" className="button is-primary" disabled={!ready || taken} onClick={() => download(`${slug}.json`, file)}>
                        <FiDownload /> Save {slug}.json
                      </button>
                      <a className="button" href={`${repoUrl}/upload/${config.branch}/themes`} target="_blank" rel="noreferrer">
                        <FiGithub /> Then add it here
                      </a>
                    </>
                  )}
                  {share.length > 0 && share.length <= SHARE_MAX && (
                    <CopyButton text={`${location.origin}/s#${share}`} icon={<FiLink />}>
                      Copy share link
                    </CopyButton>
                  )}
                  <button type="button" className="icon-button" aria-label="Start over" title="Start over" onClick={() => setRaw(null)}>
                    <FiX />
                  </button>
                </div>

                {sent.state === 'sent' && (
                  <p className="check is-good">
                    <FiCheck /> Uploaded. It shows in the gallery once it has been looked over.{' '}
                    {sent.url && <a href={sent.url}>Follow it here.</a>}
                  </p>
                )}
                {sent.state === 'failed' && (
                  <p className="check is-bad">
                    <FiAlertTriangle /> {sent.message}
                  </p>
                )}
                <p className="fine">
                  {direct
                    ? 'Uploads are looked over before they appear, so the gallery stays good.'
                    : 'Uploading opens a ready-made pull request on GitHub, where it is looked over before it appears.'}{' '}
                  A share link works straight away and holds the whole theme in the link itself.
                </p>
              </div>
              <div className="theme-preview">
                {palette ? <Mock palette={palette} scene={theme?.scene} label="Your theme" /> : <div className="empty">A preview shows once the theme checks out.</div>}
              </div>
            </div>
          </li>
        )}
      </ol>

      <p className="fine">
        No theme yet? Open the Claude desktop app and ask for one, in your own words: "make my chat look like a
        rainy night in Tokyo". Or <Link to="/">pick one from the gallery</Link>.
      </p>
    </div>
  )
}
