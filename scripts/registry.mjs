// Checks every theme in themes/ and, unless --check is given, writes the mod each
// one installs as (plugins/<slug>/) and the marketplace file that lists them.
//
//   node scripts/registry.mjs           check and generate
//   node scripts/registry.mjs --check   check only (what a pull request runs)
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { clean, compile, isSlug, registerSource, slugify } from '../shared/core.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'registry.config.json'), 'utf8'))
const checkOnly = process.argv.includes('--check')
const verbose = process.argv.includes('--verbose')

const files = readdirSync(join(root, 'themes')).filter(f => f.endsWith('.json')).sort()
const themes = []
let failed = 0

for (const file of files) {
  const slug = file.slice(0, -'.json'.length)
  const problems = []
  let theme

  try {
    theme = JSON.parse(readFileSync(join(root, 'themes', file), 'utf8'))
  } catch (error) {
    problems.push(`Not JSON: ${error.message}`)
  }

  if (theme !== undefined) {
    const result = compile(theme)
    problems.push(...result.errors, ...result.blocking)
    if (!isSlug(slug)) problems.push('The file name is lowercase letters, digits and hyphens, starting with a letter.')
    else if (result.errors.length === 0 && slugify(theme.name) !== slug) {
      problems.push(`The file name should be ${slugify(theme.name)}.json, from the theme's name.`)
    }
    if (verbose) for (const line of result.advisory) console.log(`  note ${file}: ${line}`)
  }

  if (problems.length > 0) {
    failed += 1
    console.error(`FAIL themes/${file}`)
    for (const line of problems) console.error(`  ${line}`)
  } else {
    console.log(`ok   themes/${file}`)
    themes.push({ slug, theme: clean(theme) })
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} themes failed.`)
  process.exit(1)
}

if (checkOnly) process.exit(0)

const plugins = join(root, 'plugins')
rmSync(plugins, { recursive: true, force: true })

const json = value => `${JSON.stringify(value, null, 2)}\n`

for (const { slug, theme } of themes) {
  const dir = join(plugins, slug)
  mkdirSync(join(dir, '.claude-plugin'), { recursive: true })
  mkdirSync(join(dir, 'hooks'), { recursive: true })
  writeFileSync(
    join(dir, '.claude-plugin', 'plugin.json'),
    json({
      name: slug,
      version: '1.0.0',
      description: theme.description ?? `${theme.name}, a theme from ${config.domain}`,
      author: { name: theme.author },
      homepage: `https://${config.domain}/theme/${slug}`,
    }),
  )
  const module = theme.scene ? 'register.tsx' : 'register.ts'
  writeFileSync(join(dir, 'hooks', 'hooks.json'), json({ modules: [`./${module}`] }))
  writeFileSync(join(dir, 'hooks', module), registerSource(theme, slug, config.domain))
  for (const name of ['make-colors.js', 'make-colors.d.ts']) {
    cpSync(join(root, 'template', 'hooks', name), join(dir, 'hooks', name))
  }
}

mkdirSync(join(root, '.claude-plugin'), { recursive: true })
writeFileSync(
  join(root, '.claude-plugin', 'marketplace.json'),
  json({
    name: config.marketplace,
    description: `Community themes for Claude, from https://${config.domain}`,
    owner: { name: config.domain },
    plugins: themes.map(({ slug, theme }) => ({
      name: slug,
      source: `./plugins/${slug}`,
      description: theme.description ?? theme.name,
    })),
  }),
)

console.log(`\nWrote ${themes.length} mods to plugins/ and .claude-plugin/marketplace.json.`)
