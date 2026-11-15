import { Analytics } from '@vercel/analytics/react'
import { useEffect } from 'react'
import { FiGithub, FiMoon, FiSun } from 'react-icons/fi'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'

import { repoUrl } from './lib/registry'
import { SiteProvider, useSite } from './lib/site'
import { Gallery } from './pages/Gallery'
import { SharedPage, ThemePage } from './pages/ThemePage'
import { Upload } from './pages/Upload'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Braces matter: newer browsers return a promise from scrollTo.
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Shell() {
  const { mode, setMode } = useSite()

  return (
    <>
      <header className="top">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          claudethemes<span className="brand-tld">.space</span>
        </Link>
        <nav>
          <NavLink to="/" end>
            Gallery
          </NavLink>
          <NavLink to="/upload">Upload a theme</NavLink>
          <a href={repoUrl} aria-label="Source on GitHub" className="icon-button">
            <FiGithub />
          </a>
          <button
            type="button"
            className="icon-button"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/theme/:slug" element={<ThemePage />} />
          <Route path="/s" element={<SharedPage />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<Gallery />} />
        </Routes>
      </main>
      <footer className="foot">
        <span>
          Open source, <a href={repoUrl}>on GitHub</a>. A community project, not affiliated with Anthropic.
        </span>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteProvider>
        <ScrollToTop />
        <Shell />
      </SiteProvider>
      <Analytics />
    </BrowserRouter>
  )
}
