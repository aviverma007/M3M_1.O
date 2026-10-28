// Production build: bundles src/server.ts (and the shared pure modules imported from ../frontend/src via "@/")
// into dist/server.js. npm packages stay external (installed with `npm ci --omit=dev`).
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [path.join(here, 'src/server.ts')],
  outfile: path.join(here, 'dist/server.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  alias: { '@': path.join(here, '../frontend/src') },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
})
console.log('Built dist/server.js')
