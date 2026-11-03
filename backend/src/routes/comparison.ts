/*
 * Module 21 "Comparison" — two projects side by side.
 *
 *  GET  /comparison/pair?a=<id>&b=<id>   data for both projects (project record, design summary, structure + MEP records)
 *  POST /comparison/pdf  { a, b }        the comparison as a PDF in the DPR format
 */
import { db, type Row } from '../db/table.js'
import { fail, file, ok, route } from '../http/router.js'
import { loadCompareInput } from '../dpr/load.js'
import { buildComparisonPdf } from '../dpr/comparison.js'

async function pair(a: unknown, b: unknown) {
  const ids = [a, b].map((v) => Number(v))
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) return { error: 'Select two projects to compare.' }
  const [pa, pb] = await Promise.all(ids.map((id) => db.table<Row>('projects').find(id)))
  if (!pa || !pb) return { error: 'Project not found' }
  const [A, B] = await Promise.all([loadCompareInput(pa), loadCompareInput(pb)])
  return { A, B }
}

route('GET', '/comparison/pair', async ({ query }) => {
  const r = await pair(query?.a, query?.b)
  if ('error' in r) return fail(400, r.error!)
  return ok({ a: r.A, b: r.B })
})

route('POST', '/comparison/pdf', async ({ body }) => {
  const r = await pair(body?.a, body?.b)
  if ('error' in r) return fail(400, r.error!)
  const pdf = await buildComparisonPdf(r.A!, r.B!)
  const name = `Comparison_${String(r.A!.project.name)}_vs_${String(r.B!.project.name)}`.replace(/[^a-z0-9_]+/gi, '_')
  return file(pdf, 'application/pdf', `${name}.pdf`)
})
