import { FiArrowUp, FiCheck, FiFileText, FiPlus, FiTerminal } from 'react-icons/fi'

import { sceneUrl } from '../../shared/core.js'
import type { Palette } from '../../shared/core.js'
import { varsOf } from '../lib/registry'

/** A small stand-in for a Claude session, painted from a theme's colors. */
export function Mock({ palette, label, scene }: { palette: Palette; label?: string; scene?: string }) {
  return (
    <div className={`mock${scene ? ' has-scene' : ''}`} style={varsOf(palette)} role="img" aria-label={label ?? 'Theme preview'}>
      {scene && <img className="mock-scene" src={sceneUrl(scene)} alt="" />}
      <div className="mock-side">
        <div className="mock-new">
          <FiPlus /> New session
        </div>
        <div className="mock-item is-active">Fix the login redirect</div>
        <div className="mock-item">Quarterly report draft</div>
        <div className="mock-item">Rename the build flags</div>
        <div className="mock-item mock-item-muted">Yesterday</div>
        <div className="mock-item">Tidy the changelog</div>
      </div>
      <div className="mock-main">
        <div className="mock-user">Why does login bounce back to the home page?</div>
        <div className="mock-text">
          The redirect reads <span className="mock-inline">next</span> before the session is saved. Here is
          the fix:
        </div>
        <div className="mock-tool">
          <FiTerminal /> <span>Edit</span> <span className="mock-muted">auth/redirect.ts</span>
          <span className="mock-added">+4</span>
          <span className="mock-removed">-1</span>
        </div>
        <pre className="mock-code">
          <span className="k">export async function</span> <span className="n">redirect</span>(
          <span className="v">req</span>) {'{\n'}
          {'  '}
          <span className="k">const</span> <span className="v">next</span> = <span className="v">req</span>
          .query.next ?? <span className="s">'/home'</span>
          {'\n  '}
          <span className="k">await</span> <span className="v">session</span>.<span className="n">save</span>()
          {'\n  '}
          <span className="k">return</span> <span className="n">go</span>(<span className="v">next</span>,{' '}
          <span className="l">302</span>){'\n}'}
        </pre>
        <div className="mock-status">
          <span className="mock-ok">
            <FiCheck /> 12 tests passed
          </span>
          <span className="mock-warn">1 warning</span>
          <span className="mock-link">
            <FiFileText /> redirect.ts
          </span>
        </div>
        <div className="mock-prompt">
          <span>Reply to Claude</span>
          <span className="mock-send">
            <FiArrowUp />
          </span>
        </div>
      </div>
    </div>
  )
}
