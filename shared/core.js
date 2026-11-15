// Shared by the site (browser) and the registry scripts (Node). Plain JS on purpose.
import { makeColors } from '../template/hooks/make-colors.js'

export const ANCHORS = [
  'surface-0',
  'surface-1',
  'surface-2',
  'surface-3',
  'text-primary',
  'text-secondary',
  'text-muted',
]
export const REQUIRED_ANCHORS = ['surface-0', 'text-primary']
export const ROLES = ['accent', 'danger', 'success', 'warning', 'pro']
export const MODES = ['light', 'dark']

/** Claude's own limit on a backdrop scene. */
export const SCENE_MAX = 131072
/** The longest theme a link carries. A theme with a big scene goes to the gallery instead. */
export const SHARE_MAX = 6000

const HEX = /^#[0-9a-f]{6}$/i
const SLUG = /^[a-z][a-z0-9-]{1,30}$/
const TOP_KEYS = ['name', 'author', 'description', 'tags', 'roles', 'light', 'dark', 'scene']

// A scene is an SVG that moves with CSS alone. Claude runs no script in it and loads
// nothing; these keep a submitted one honest about that.
const SCENE_BANNED = [
  [/<script/i, 'a <script>'],
  [/<foreignObject/i, 'a <foreignObject>'],
  [/\son[a-z]+\s*=/i, 'an event handler such as onload'],
  [/javascript:/i, 'a javascript: link'],
  [/@import/i, 'an @import'],
  [/(href|src)\s*=\s*["'](?!#|data:image\/)/i, 'a link to something outside the file'],
  [/url\(\s*["']?(?!#|data:image\/)/i, 'a url() to something outside the file'],
]

export const isHex = v => typeof v === 'string' && HEX.test(v)

export function slugify(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 31)
    .replace(/-+$/, '')
  return /^[a-z]/.test(slug) ? slug : slug ? `t-${slug}`.slice(0, 31) : ''
}

export const isSlug = v => typeof v === 'string' && SLUG.test(v)

export function sceneProblems(scene) {
  if (typeof scene !== 'string') return ['"scene" is the SVG source, as text.']
  const problems = []
  if (!/^\s*<svg[\s>]/i.test(scene) || !/<\/svg>\s*$/i.test(scene)) {
    problems.push('"scene" starts with <svg and ends with </svg>.')
  }
  if (scene.length > SCENE_MAX) problems.push(`"scene" is at most ${SCENE_MAX} characters.`)
  if (!/viewBox\s*=/.test(scene)) problems.push('"scene" needs a viewBox so it fills any screen.')
  for (const [pattern, what] of SCENE_BANNED) {
    if (pattern.test(scene)) problems.push(`"scene" can't hold ${what}.`)
  }
  return problems
}

/** Shape errors, as plain lines. An empty list means the file is a theme. */
export function validate(theme) {
  const errors = []
  if (theme === null || typeof theme !== 'object' || Array.isArray(theme)) {
    return ['A theme is a JSON object.']
  }
  for (const key of Object.keys(theme)) {
    if (!TOP_KEYS.includes(key)) errors.push(`Unknown key "${key}".`)
  }
  const text = (key, max, required) => {
    const v = theme[key]
    if (v === undefined || v === '') {
      if (required) errors.push(`"${key}" is required.`)
      return
    }
    if (typeof v !== 'string') errors.push(`"${key}" is text.`)
    else if (v.length > max) errors.push(`"${key}" is at most ${max} characters.`)
    // eslint-disable-next-line no-control-regex
    else if (/[<>\u0000-\u001f]/.test(v)) errors.push(`"${key}" can't hold < > or control characters.`)
  }
  text('name', 40, true)
  text('author', 39, true)
  text('description', 140, false)
  if (typeof theme.name === 'string' && theme.name && !isSlug(slugify(theme.name))) {
    errors.push('"name" needs at least two letters or digits.')
  }
  if (theme.tags !== undefined) {
    if (!Array.isArray(theme.tags) || theme.tags.length > 5) errors.push('"tags" is a list of at most 5.')
    else if (!theme.tags.every(t => typeof t === 'string' && /^[a-z0-9-]{2,16}$/.test(t))) {
      errors.push('Each tag is 2 to 16 lowercase letters, digits or hyphens.')
    }
  }
  if (theme.roles !== undefined) {
    if (theme.roles === null || typeof theme.roles !== 'object') errors.push('"roles" is an object.')
    else {
      for (const [k, v] of Object.entries(theme.roles)) {
        if (!ROLES.includes(k)) errors.push(`Unknown role "${k}".`)
        else if (!isHex(v)) errors.push(`roles.${k} is a six-digit hex color.`)
      }
    }
  }
  if (theme.scene !== undefined) errors.push(...sceneProblems(theme.scene))
  if (theme.light === undefined && theme.dark === undefined) {
    errors.push('Give a "light" half, a "dark" half, or both.')
  }
  for (const mode of MODES) {
    const half = theme[mode]
    if (half === undefined) continue
    if (half === null || typeof half !== 'object') {
      errors.push(`"${mode}" is an object of colors.`)
      continue
    }
    for (const [k, v] of Object.entries(half)) {
      if (!ANCHORS.includes(k)) errors.push(`Unknown color "${mode}.${k}".`)
      else if (!isHex(v)) errors.push(`${mode}.${k} is a six-digit hex color.`)
    }
    for (const k of REQUIRED_ANCHORS) {
      if (half[k] === undefined) errors.push(`${mode}.${k} is required.`)
    }
  }
  return errors
}

/** The argument makeColors takes, from a theme file. */
export function toDefinition(theme) {
  const def = { label: theme.name }
  if (theme.roles && Object.keys(theme.roles).length > 0) def.roles = { ...theme.roles }
  for (const mode of MODES) {
    if (theme[mode]) def[mode] = { gray: { anchors: { ...theme[mode] } } }
  }
  if (!theme.light) def.only = 'dark'
  if (!theme.dark) def.only = 'light'
  return def
}

const BLOCKING = "Desktop won't paint"

/** Runs the design system's own code over a theme. Never throws. */
export function compile(theme) {
  const errors = validate(theme)
  if (errors.length > 0) return { colors: null, errors, blocking: [], advisory: [] }
  try {
    const { theme: colors, problems } = makeColors(toDefinition(theme))
    return {
      colors,
      errors: [],
      blocking: problems.filter(p => p.startsWith(BLOCKING)),
      advisory: problems.filter(p => !p.startsWith(BLOCKING)),
    }
  } catch (error) {
    return { colors: null, errors: [String(error?.message ?? error)], blocking: [], advisory: [] }
  }
}

// Which palette stop each name reads, [light, dark], as the design system has it.
const STOPS = {
  s0: ['gray-20', 'gray-900'],
  s1: ['gray-10', 'gray-850'],
  s2: ['gray-0', 'gray-830'],
  s3: ['gray-0', 'gray-800'],
  tp: ['gray-900', 'gray-50'],
  ts: ['gray-600', 'gray-200'],
  tm: ['gray-400', 'gray-400'],
  ink: ['gray-900', 'gray-0'],
  accent: ['role-accent-600', 'role-accent-300'],
  danger: ['role-danger-600', 'role-danger-300'],
  success: ['role-success-600', 'role-success-400'],
  warning: ['role-warning-600', 'role-warning-300'],
  pro: ['role-pro-600', 'role-pro-300'],
  'accent-fill': ['role-accent-fill', 'role-accent-fill'],
  'accent-fill-hover': ['role-accent-fill-hover', 'role-accent-fill-hover'],
  'on-accent': ['role-accent-on', 'role-accent-on'],
  'accent-bg': ['role-accent-100', 'role-accent-800'],
  added: ['text-git-added', 'text-git-added'],
  removed: ['text-git-removed', 'text-git-removed'],
}

/** The handful of resolved colors the site paints a preview with, for one mode. */
export function paletteOf(colors, mode) {
  const inputs = colors?.inputs?.[mode]
  if (!inputs) return null
  const out = {}
  for (const [name, pair] of Object.entries(STOPS)) {
    const value = inputs[pair[mode === 'dark' ? 1 : 0]]
    if (!isHex(value)) return null
    out[name] = value
  }
  return out
}

export const modesOf = theme => MODES.filter(mode => theme?.[mode])

/** Only the keys a theme file holds, in a stable order, empty values dropped. */
export function clean(theme) {
  const out = { name: String(theme.name ?? '').trim(), author: String(theme.author ?? '').trim() }
  const description = String(theme.description ?? '').trim()
  if (description) out.description = description
  if (Array.isArray(theme.tags) && theme.tags.length > 0) out.tags = [...theme.tags]
  const pick = (from, keys) => {
    const half = {}
    for (const k of keys) if (from?.[k]) half[k] = String(from[k]).toLowerCase()
    return half
  }
  const roles = pick(theme.roles, ROLES)
  if (Object.keys(roles).length > 0) out.roles = roles
  for (const mode of MODES) if (theme[mode]) out[mode] = pick(theme[mode], ANCHORS)
  if (typeof theme.scene === 'string' && theme.scene.trim()) out.scene = theme.scene.trim()
  return out
}

/** The data URL a page shows a scene with. An <img> runs no script and loads nothing. */
export const sceneUrl = scene => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scene)}`

export function encodeShare(theme) {
  const bytes = new TextEncoder().encode(JSON.stringify(clean(theme)))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A theme from a share link, or null when it isn't one. */
export function decodeShare(text) {
  try {
    if (!text || text.length > SHARE_MAX) return null
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const theme = JSON.parse(new TextDecoder().decode(bytes))
    return validate(theme).length === 0 ? clean(theme) : null
  } catch {
    return null
  }
}

/** A theme from what a person pasted: bare JSON, or JSON inside a code fence. */
export function parsePasted(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const value = JSON.parse(text.slice(start, end + 1))
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

/** The hooks module of the mod generated for a theme: register.ts, or .tsx with a scene. */
export function registerSource(theme, slug, domain) {
  const tidy = clean(theme)
  const def = JSON.stringify(toDefinition(tidy), null, 2)
  const head = `// Generated by ${domain} from themes/${slug}.json. Don't edit: change that file.
import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const { theme } = makeColors(${def})
`
  if (!tidy.scene) {
    return `${head}
const LOOK: ThemeSetArgs = { colors: theme }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.theme.set(LOOK)

    return next(e)
  })
}
`
  }
  return `${head}
const SCENE = ${JSON.stringify(tidy.scene)}

const LOOK: ThemeSetArgs = { colors: theme, backdrop: { scene: ${JSON.stringify(slug)} } }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.theme.set(LOOK)

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt=${JSON.stringify(`${tidy.name} backdrop`)} />
  })
}
`
}

/** What a person pastes into the Claude app to put on a theme that came by link. */
export function claudePrompt(theme) {
  const tidy = clean(theme)
  const def = JSON.stringify(toDefinition(tidy), null, 2)
  const scene = tidy.scene
    ? `\n\nDraw this SVG, unchanged, as the theme's backdrop scene:\n\n${tidy.scene}`
    : ''
  return `Make me a theme called "${tidy.name}" for this Claude app. Call makeColors with exactly this definition and apply the result. Change no colors.\n\n${def}${scene}`
}

/** What a person pastes into the Claude app to put on a theme from the gallery. */
export function installPrompt(theme, slug, repo, marketplace) {
  return `Install the "${theme.name}" theme for my Claude app. Run these two commands in order, then tell me how to see it:\n\nclaude plugin marketplace add ${repo}\nclaude plugin install ${slug}@${marketplace}`
}

/** What a person pastes into Claude, in the chat that made their theme, to get it as a file. */
export const EXPORT_PROMPT = `Export the theme you made me so I can share it on claudethemes.space. Reply with one JSON code block and nothing else, in this shape, using the exact colors my theme passes to makeColors:

{
  "name": "<a short name for the theme>",
  "author": "",
  "description": "<one line, at most 140 characters>",
  "tags": ["<up to five lowercase words>"],
  "roles": { "accent": "#rrggbb", "danger": "#rrggbb", "success": "#rrggbb", "warning": "#rrggbb", "pro": "#rrggbb" },
  "light": { "surface-0": "#rrggbb", "surface-1": "#rrggbb", "surface-2": "#rrggbb", "text-primary": "#rrggbb", "text-secondary": "#rrggbb", "text-muted": "#rrggbb" },
  "dark": { "surface-0": "#rrggbb", "surface-1": "#rrggbb", "surface-2": "#rrggbb", "surface-3": "#rrggbb", "text-primary": "#rrggbb", "text-secondary": "#rrggbb", "text-muted": "#rrggbb" },
  "scene": "<the full SVG source of the backdrop scene>"
}

Leave out "light" or "dark" if my theme has only the other, any color my theme doesn't set, and "scene" if there is no backdrop scene.`
