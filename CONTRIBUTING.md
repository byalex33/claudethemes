# Contributing a theme

The easy way: go to https://claudethemes.space/upload, copy the export prompt into the Claude chat that made your theme, and drop what Claude gives you on the page.

By hand: add `themes/<slug>.json`, where the slug is your theme's name in lowercase with hyphens, then run `npm run check`.

## Rules

- **Data only.** A theme file holds `name`, `author`, optional `description` and `tags`, `roles`, a `light` half, a `dark` half or both, and an optional `scene`. Every color is six-digit hex.
- **Claude must paint it.** The check fails a theme whose contrast is low enough that the desktop app would ignore it.
- **Scenes move with CSS only.** An SVG with a `viewBox`, at most 131,072 characters, no script, no event handlers, nothing loaded from outside the file. Respect `prefers-reduced-motion`.
- **Keep meaning.** Danger stays a red, success a green, warning an amber.
- **Your own work.** Take the spirit of a place or an era. No company's logo, artwork, characters or trademarked palette name.
- **One theme per pull request**, and don't edit `plugins/` or `.claude-plugin/`: CI generates them.

## Working on the site

See the README. Use react-icons for icons, never emoji.
