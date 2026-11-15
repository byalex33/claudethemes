import type { CSSProperties } from 'react'

import config from '../../registry.config.json'
import { compile, modesOf, paletteOf } from '../../shared/core.js'
import type { Mode, Palette, Theme } from '../../shared/core.js'

export { config }

export type Entry = {
  slug: string
  theme: Theme
  modes: Mode[]
  palettes: Partial<Record<Mode, Palette>>
}

export function entryOf(slug: string, theme: Theme): Entry {
  const { colors } = compile(theme)
  const palettes: Entry['palettes'] = {}
  for (const mode of modesOf(theme)) {
    const palette = paletteOf(colors, mode)
    if (palette) palettes[mode] = palette
  }
  return { slug, theme, modes: modesOf(theme), palettes }
}

const files = import.meta.glob<Theme>('../../themes/*.json', { eager: true, import: 'default' })

export const THEMES: Entry[] = Object.entries(files)
  .map(([path, theme]) => entryOf(path.split('/').pop()!.replace(/\.json$/, ''), theme))
  .sort((a, b) => a.theme.name.localeCompare(b.theme.name))

export const DEFAULT_SLUG = 'paper-notebook'

/** The mode an entry is shown in when the site is in `mode`: its own, if it has only one. */
export function shownMode(entry: Entry, mode: Mode): Mode {
  return entry.palettes[mode] ? mode : (entry.modes[0] ?? mode)
}

export function paletteFor(entry: Entry, mode: Mode): Palette | undefined {
  return entry.palettes[shownMode(entry, mode)]
}

export function varsOf(palette: Palette): CSSProperties {
  const vars: Record<string, string> = {}
  for (const [name, value] of Object.entries(palette)) vars[`--${name}`] = value
  return vars as CSSProperties
}

export const shellLines = (slug: string) => [
  `claude plugin marketplace add ${config.repo}`,
  `claude plugin install ${slug}@${config.marketplace}`,
]
export const repoUrl = `https://github.com/${config.repo}`

export function submitUrl(slug: string, theme: Theme): string {
  const value = `${JSON.stringify(theme, null, 2)}\n`
  const query = new URLSearchParams({
    filename: `themes/${slug}.json`,
    value,
    message: `Add ${theme.name}`,
  })
  return `${repoUrl}/new/${config.branch}?${query}`
}
