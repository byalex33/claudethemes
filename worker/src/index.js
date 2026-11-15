// The upload endpoint: lets a person put a theme in the review queue with no account.
// It checks the theme with the same code the site and CI use, then opens a pull
// request as the project's bot. Nothing is listed until a maintainer merges it.
//
// Secrets: GITHUB_TOKEN, a fine-grained token for the one repository with
// "Contents: write" and "Pull requests: write".
// Optional binding: LIMITER, a rate limiting binding keyed by IP (see wrangler.toml).
import config from '../../registry.config.json'
import { clean, compile, slugify } from '../../shared/core.js'

const MAX_BYTES = 200_000
const API = `https://api.github.com/repos/${config.repo}`
const ALLOWED = [`https://${config.domain}`, `https://www.${config.domain}`]

const cors = origin => ({
  'access-control-allow-origin': ALLOWED.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin ?? '') ? origin : ALLOWED[0],
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  vary: 'origin',
})

const reply = (origin, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(origin) } })

async function github(env, path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'claudethemes-upload',
      'content-type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  return { ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) }
}

const base64 = text => {
  let binary = ''
  for (const b of new TextEncoder().encode(text)) binary += String.fromCharCode(b)
  return btoa(binary)
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
    if (request.method !== 'POST') return reply(origin, 405, { error: 'POST a theme.' })

    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })
      if (!success) return reply(origin, 429, { error: 'Too many uploads from here. Try again in a few minutes.' })
    }

    const text = await request.text()
    if (text.length > MAX_BYTES) return reply(origin, 413, { error: 'That file is too big to be a theme.' })

    let theme
    try {
      theme = JSON.parse(text).theme
    } catch {
      return reply(origin, 400, { error: "That isn't a theme file." })
    }

    const result = compile(theme)
    const problems = [...result.errors, ...result.blocking]
    if (problems.length > 0) return reply(origin, 422, { error: problems[0], problems })

    const tidy = clean(theme)
    const slug = slugify(tidy.name)
    const path = `themes/${slug}.json`

    const existing = await github(env, `/contents/${path}?ref=${config.branch}`)
    if (existing.ok) return reply(origin, 409, { error: `The gallery already has a theme called ${tidy.name}.` })

    const head = await github(env, `/git/ref/heads/${config.branch}`)
    if (!head.ok) return reply(origin, 502, { error: 'The gallery is unreachable right now. Try again shortly.' })

    const branch = `upload/${slug}-${crypto.randomUUID().slice(0, 8)}`
    const made = await github(env, '/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: head.data.object.sha } })
    if (!made.ok) return reply(origin, 502, { error: 'The upload could not be queued. Try again shortly.' })

    const put = await github(env, `/contents/${path}`, {
      method: 'PUT',
      body: { message: `Add ${tidy.name}`, branch, content: base64(`${JSON.stringify(tidy, null, 2)}\n`) },
    })
    if (!put.ok) return reply(origin, 502, { error: 'The upload could not be saved. Try again shortly.' })

    const pull = await github(env, '/pulls', {
      method: 'POST',
      body: {
        title: `Add ${tidy.name}`,
        head: branch,
        base: config.branch,
        body: `Uploaded from https://${config.domain}/upload.\n\n- Name: ${tidy.name}\n- By: ${tidy.author}\n- Modes: ${['light', 'dark'].filter(m => tidy[m]).join(', ')}\n- Moving backdrop: ${tidy.scene ? 'yes' : 'no'}`,
      },
    })
    if (!pull.ok) return reply(origin, 502, { error: 'The upload was saved but not queued. A maintainer will pick it up.' })

    return reply(origin, 201, { url: pull.data.html_url })
  },
}
