export type Mode = 'light' | 'dark'
export type Anchor =
  | 'surface-0'
  | 'surface-1'
  | 'surface-2'
  | 'surface-3'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
export type Role = 'accent' | 'danger' | 'success' | 'warning' | 'pro'
export type Half = Partial<Record<Anchor, string>>

export type Theme = {
  name: string
  author: string
  description?: string
  tags?: string[]
  roles?: Partial<Record<Role, string>>
  light?: Half
  dark?: Half
  /** The SVG source of a moving backdrop. */
  scene?: string
}

export type Palette = Record<
  | 's0' | 's1' | 's2' | 's3' | 'tp' | 'ts' | 'tm' | 'ink'
  | 'accent' | 'danger' | 'success' | 'warning' | 'pro'
  | 'accent-fill' | 'accent-fill-hover' | 'on-accent' | 'accent-bg'
  | 'added' | 'removed',
  string
>

export type Compiled = {
  colors: unknown
  errors: string[]
  blocking: string[]
  advisory: string[]
}

export const ANCHORS: Anchor[]
export const REQUIRED_ANCHORS: Anchor[]
export const ROLES: Role[]
export const MODES: Mode[]
export function isHex(v: unknown): v is string
export function slugify(name: string): string
export function isSlug(v: unknown): boolean
export function validate(theme: unknown): string[]
export function toDefinition(theme: Theme): Record<string, unknown>
export function compile(theme: Theme): Compiled
export function paletteOf(colors: unknown, mode: Mode): Palette | null
export function modesOf(theme: Theme): Mode[]
export function clean(theme: Theme): Theme
export function encodeShare(theme: Theme): string
export function decodeShare(text: string): Theme | null
export function registerSource(theme: Theme, slug: string, domain: string): string
export function claudePrompt(theme: Theme): string
export function installPrompt(theme: Theme, slug: string, repo: string): string
export function sceneProblems(scene: unknown): string[]
export function sceneUrl(scene: string): string
export function parsePasted(text: string): Record<string, unknown> | null
export const EXPORT_PROMPT: string
export const SCENE_MAX: number
export const SHARE_MAX: number
