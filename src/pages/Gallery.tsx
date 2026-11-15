import { useMemo, useState } from 'react'
import { FiSearch, FiUploadCloud } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { ThemeCard } from '../components/bits'
import { THEMES } from '../lib/registry'
import { useSite } from '../lib/site'

export function Gallery() {
  const { mode } = useSite()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { theme } of THEMES) for (const t of theme.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return THEMES.filter(({ theme }) => {
      if (tag && !(theme.tags ?? []).includes(tag)) return false
      if (!q) return true
      return [theme.name, theme.author, theme.description ?? '', ...(theme.tags ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, tag])

  return (
    <>
      <section className="hero">
        <h1>Themes for the Claude app, made by everyone.</h1>
        <p>
          Find a look for your Claude desktop app and put it on with one paste. Made one you love? Upload it
          for everyone else. No account needed.
        </p>
        <div className="hero-actions">
          <Link to="/upload" className="button is-primary">
            <FiUploadCloud /> Upload your theme
          </Link>
          <a href="#how" className="button">
            How sharing works
          </a>
        </div>
      </section>

      <section className="filters" aria-label="Filter themes">
        <label className="search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder={`Search ${THEMES.length} themes`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search themes"
          />
        </label>
        <div className="tags">
          {tags.map(t => (
            <button
              key={t}
              type="button"
              className={`tag${tag === t ? ' is-on' : ''}`}
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {shown.length > 0 ? (
        <section className="grid">
          {shown.map(entry => (
            <ThemeCard key={entry.slug} entry={entry} mode={mode} />
          ))}
        </section>
      ) : (
        <p className="empty">
          No theme matches that yet. <Link to="/upload">Upload the first one.</Link>
        </p>
      )}

      <section className="how" id="how">
        <h2>How sharing works</h2>
        <div className="steps">
          <div>
            <h3>1. Ask Claude for a theme</h3>
            <p>
              In the Claude desktop app, describe the look you want. Claude builds it, moving backdrop and
              all. Then get it out with our <Link to="/upload">export prompt</Link>.
            </p>
          </div>
          <div>
            <h3>2. Upload it</h3>
            <p>
              Drop the file on the <Link to="/upload">upload page</Link>. You see a preview at once, and can
              copy a link that holds the whole theme to send to a friend.
            </p>
          </div>
          <div>
            <h3>3. Get listed</h3>
            <p>
              Uploads are looked over before they appear, so the gallery stays good. A theme is colors and a
              picture, never code, so it is safe to put on.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
