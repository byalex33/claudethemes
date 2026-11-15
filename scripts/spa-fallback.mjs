// GitHub Pages serves 404.html for unknown paths; a copy of the app there makes
// /theme/<slug> and /create load directly.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
