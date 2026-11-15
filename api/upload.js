// The upload endpoint: lets a person put a theme in the review queue with no account.
// It checks the theme with the same code the site and CI use, then opens a pull
// request as the project's bot. Nothing is listed until a maintainer merges it.
//
// Needs one environment variable in Vercel: GITHUB_TOKEN, a fine-grained token for
// this repository only, with "Contents: write" and "Pull requests: write".
// Without it, GET answers { ready: false } and the site hands uploaders to GitHub.
import { readFileSync } from 'node:fs'

import { clean, compile, slugify } from '../shared/core.js'

const config = JSON.parse(readFileSync(new URL('../registry.config.json', import.meta.url), 'utf8'))

const MAX_BYTES = 200_000
const API = `https://api.github.com/repos/${config.repo}`

// A small brake on floods: at most this many uploads from one address per window,
// per warm instance. The pull request queue is the real moderation.
// The queue itself is capped too. Unlike the per-address brake this holds across
// instances and restarts, because the count comes from GitHub.
const QUEUE_MAX = 25

const WINDOW_MS = 10 * 60 * 1000
const PER_WINDOW = 5
const seen = new Map()

function allowed(ip) {
  const now = Date.now()
  const hits = (seen.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  if (hits.length >= PER_WINDOW) return false
  hits.push(now)
  seen.set(ip, hits)
  return true
}

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

async function github(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'claudethemes-upload',
      'content-type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  return { ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) }
}

function sameOrigin(request) {
  try {
    return new URL(request.headers.get('origin') ?? '').host === new URL(request.url).host
  } catch {
    return false
  }
}

// Text an uploader chose, made safe to show in a pull request: inside a code span
// nothing is a mention, a link or markup.
const quoted = value => `\`${String(value).replace(/`/g, "'")}\``

export function GET() {
  return reply(200, { ready: Boolean(process.env.GITHUB_TOKEN) })
}

export async function POST(request) {
  if (!process.env.GITHUB_TOKEN) return reply(503, { error: 'Uploads are not switched on yet.' })

  if (!sameOrigin(request)) return reply(403, { error: 'Upload from the site itself.' })

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (!allowed(ip)) return reply(429, { error: 'Too many uploads from here. Try again in a few minutes.' })

  const text = await request.text()
  if (text.length > MAX_BYTES) return reply(413, { error: 'That file is too big to be a theme.' })

  let theme
  try {
    theme = JSON.parse(text).theme
  } catch {
    return reply(400, { error: "That isn't a theme file." })
  }

  const result = compile(theme)
  const problems = [...result.errors, ...result.blocking]
  if (problems.length > 0) return reply(422, { error: problems[0], problems })

  const tidy = clean(theme)
  const slug = slugify(tidy.name)
  const path = `themes/${slug}.json`

  const existing = await github(`/contents/${path}?ref=${config.branch}`)
  if (existing.ok) return reply(409, { error: `The gallery already has a theme called ${tidy.name}.` })

  const queue = await github('/pulls?state=open&per_page=100')
  if (queue.ok && queue.data.filter(pull => pull.head?.ref?.startsWith('upload/')).length >= QUEUE_MAX) {
    return reply(429, { error: 'The review queue is full right now. Try again in a day or so.' })
  }

  const head = await github(`/git/ref/heads/${config.branch}`)
  if (!head.ok) return reply(502, { error: 'The gallery is unreachable right now. Try again shortly.' })

  const branch = `upload/${slug}-${crypto.randomUUID().slice(0, 8)}`
  const made = await github('/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: head.data.object.sha } })
  if (!made.ok) return reply(502, { error: 'The upload could not be queued. Try again shortly.' })

  const put = await github(`/contents/${path}`, {
    method: 'PUT',
    body: {
      message: `feat(themes): add ${slug}`,
      branch,
      content: Buffer.from(`${JSON.stringify(tidy, null, 2)}\n`).toString('base64'),
    },
  })
  if (!put.ok) return reply(502, { error: 'The upload could not be saved. Try again shortly.' })

  const pull = await github('/pulls', {
    method: 'POST',
    body: {
      title: `feat(themes): add ${slug}`,
      head: branch,
      base: config.branch,
      body: `Uploaded from https://${config.domain}/upload.\n\n- Name: ${quoted(tidy.name)}\n- By: ${quoted(tidy.author)}\n- Modes: ${['light', 'dark'].filter(m => tidy[m]).join(', ')}\n- Moving backdrop: ${tidy.scene ? 'yes' : 'no'}`,
    },
  })
  if (!pull.ok) return reply(502, { error: 'The upload was saved but not queued. A maintainer will pick it up.' })

  return reply(201, { url: pull.data.html_url })
}
