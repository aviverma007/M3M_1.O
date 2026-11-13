/*
 * Module 21 "Comparison" — 2 to 5 projects side by side.
 *
 *  GET    /comparison/inputs?ids=1,2,3          data of each project (project record, design summary, structure + MEP)
 *  GET    /comparison/stats?portfolio=<name>    portfolio average / best / lowest per comparison row (test projects left out)
 *  POST   /comparison/pdf { ids: [..] }         the comparison as a PDF in the DPR format (also { a, b })
 *  GET    /comparison/sets                      saved comparison sets ("Gurgaon premium projects")
 *  POST   /comparison/sets { name, projectIds }
 *  DELETE /comparison/sets/:id
 *  GET    /comparison/pair?a=&b=                (first version, kept for old links)
 */
import { db, type Row } from '../db/table.js'
import { query } from '../db/pool.js'
import { fail, file, ok, route } from '../http/router.js'
import { audit } from '../http/helpers.js'
import { loadCompareInput } from '../dpr/load.js'
import { buildComparisonPdf } from '../dpr/comparison.js'
import { loadInputs } from './portfolio.js'
import { portfolioRowStats, type CompareInput } from '@/lib/projectComparison'
import { isTestProject } from '@/lib/dataChecks'

const MAX = 5

function parseIds(v: unknown): number[] {
  const list = Array.isArray(v) ? v : String(v ?? '').split(',')
  return [...new Set(list.map((x) => Number(String(x).trim())).filter((n) => Number.isInteger(n) && n > 0))]
}

async function inputsFor(ids: number[]) {
  if (ids.length < 2) return { error: 'Select at least two projects to compare.' }
  if (ids.length > MAX) return { error: `Compare up to ${MAX} projects at a time.` }
  const rows = await Promise.all(ids.map((id) => db.table<Row>('projects').find(id)))
  if (rows.some((r) => !r)) return { error: 'Project not found' }
  return { inputs: await Promise.all(rows.map((r) => loadCompareInput(r!))) }
}

/** portfolio reference values for the comparison rows */
async function stats(portfolio?: string) {
  const all = (await loadInputs()).map(({ input }) => input)
  const scope = all.filter(
    (i) => !isTestProject(String(i.project.name ?? '')) && (!portfolio || portfolio === 'All' || String(i.project.locationCategory ?? '') === portfolio),
  )
  const inputs: CompareInput[] = scope.map((i) => ({ project: i.project, summary: i.summary, structure: i.structure ?? null, mep: i.mep ?? null }))
  return { portfolio: portfolio || 'All', projects: inputs.length, rows: portfolioRowStats(inputs) }
}

route('GET', '/comparison/inputs', async ({ query: q }) => {
  const r = await inputsFor(parseIds(q?.ids))
  if ('error' in r) return fail(400, r.error!)
  return ok({ inputs: r.inputs })
})

route('GET', '/comparison/stats', async ({ query: q }) => ok(await stats(q?.portfolio)))

route('GET', '/comparison/pair', async ({ query: q }) => {
  const r = await inputsFor(parseIds([q?.a, q?.b]))
  if ('error' in r) return fail(400, r.error!)
  return ok({ a: r.inputs![0], b: r.inputs![1] })
})

route('POST', '/comparison/pdf', async ({ body }) => {
  const ids = parseIds(body?.ids ?? [body?.a, body?.b])
  const r = await inputsFor(ids)
  if ('error' in r) return fail(400, r.error!)
  // portfolio reference: the portfolio of the first project when all share it, else the whole company
  const ports = [...new Set(r.inputs!.map((i) => String(i.project.locationCategory ?? '')))]
  const ref = await stats(ports.length === 1 ? ports[0] : 'All')
  const pdf = await buildComparisonPdf(r.inputs!, ref)
  const name = `Comparison_${r.inputs!.map((i) => String(i.project.name)).join('_vs_')}`.replace(/[^a-z0-9_]+/gi, '_').slice(0, 120)
  return file(pdf, 'application/pdf', `${name}.pdf`)
})

/* ------------------------------------------------------------------ saved sets */
let setsReady: Promise<boolean> | null = null
/** dbo.comparisonSets (created here if the database user may; otherwise run database/08_comparison_sets.sql) */
function ensureSets() {
  setsReady ??= query(
    `IF OBJECT_ID(N'dbo.comparisonSets') IS NULL
     CREATE TABLE dbo.comparisonSets (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(200) NOT NULL,
       projectIds NVARCHAR(MAX) NOT NULL CONSTRAINT CK_comparisonSets_ids CHECK (ISJSON(projectIds) = 1),
       createdBy INT NULL,
       creatorName NVARCHAR(200) NULL,
       createdAt DATETIME2 NOT NULL CONSTRAINT DF_comparisonSets_created DEFAULT SYSUTCDATETIME(),
       updatedAt DATETIME2 NOT NULL CONSTRAINT DF_comparisonSets_updated DEFAULT SYSUTCDATETIME()
     )`,
  )
    .then(() => true)
    .catch((e) => {
      console.error('[comparison] comparisonSets table missing and could not be created — run database/08_comparison_sets.sql', e?.message ?? e)
      setsReady = null
      return false
    })
  return setsReady
}
const sets = () => db.table<Row>('comparisonSets')
const SETS_MISSING = 'Saved comparisons need the database update: run database/08_comparison_sets.sql once in SSMS.'

route('GET', '/comparison/sets', async () => {
  if (!(await ensureSets())) return fail(503, SETS_MISSING)
  const rows = await sets().all({ orderBy: 'name' })
  return ok(rows.map((r) => ({ id: r.id, name: r.name, projectIds: Array.isArray(r.projectIds) ? r.projectIds : [], creatorName: r.creatorName, createdAt: r.createdAt })))
})

route('POST', '/comparison/sets', async ({ body, user }) => {
  if (!(await ensureSets())) return fail(503, SETS_MISSING)
  const name = String(body?.name ?? '').trim().slice(0, 200)
  const ids = parseIds(body?.projectIds)
  if (!name) return fail(400, 'Give the comparison a name.')
  if (ids.length < 2 || ids.length > MAX) return fail(400, `A comparison needs 2 to ${MAX} projects.`)
  const existing = await sets().first({ name })
  const row = existing
    ? await sets().update(existing.id, { projectIds: ids, creatorName: user?.name ?? null, createdBy: user?.id ?? null })
    : await sets().insert({ name, projectIds: ids, createdBy: user?.id ?? null, creatorName: user?.name ?? null })
  await audit(user, 'Comparison Saved', `${user?.name ?? 'User'} saved the comparison "${name}" (${ids.length} projects).`)
  return ok({ id: row?.id, name, projectIds: ids }, 'Comparison saved')
})

route('DELETE', '/comparison/sets/:id', async ({ params, user }) => {
  if (!(await ensureSets())) return fail(503, SETS_MISSING)
  const id = Number(params.id)
  const row = Number.isInteger(id) ? await sets().find(id) : undefined
  if (!row) return fail(404, 'Saved comparison not found')
  await sets().remove(id)
  await audit(user, 'Comparison Deleted', `${user?.name ?? 'User'} deleted the saved comparison "${row.name}".`)
  return ok(null, 'Deleted')
})
