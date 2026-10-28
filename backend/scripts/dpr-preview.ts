/* Dev helper: render a DPR from a JSON fixture without the database.
 *   npx tsx scripts/dpr-preview.ts <fixture.json> <out.pdf> "Module A,Module B"
 * fixture = DprInput (project, summary, structure, mep, benchmarks, date); images are read from disk paths or skipped. */
import fs from 'node:fs'
import { buildDprPdf, type DprInput } from '../src/dpr/index.js'

const [fixture, out, mods] = process.argv.slice(2)
const input = JSON.parse(fs.readFileSync(fixture, 'utf8')) as DprInput
if (input.date) input.date = new Date(input.date as unknown as string)
const buf = await buildDprPdf(input, (mods ?? '').split(',').map((s) => s.trim()).filter(Boolean), async (url) => {
  const p = url.replace(/^file:\/\//, '')
  return fs.existsSync(p) ? fs.readFileSync(p) : null
})
fs.writeFileSync(out, buf)
console.log('wrote', out, buf.length)
