/*
 * Portfolio (owner view) and project health.
 *
 *  GET /portfolio     every project with its figures, completeness, data issues, benchmark checks and health score
 *  GET /portfolio/:id one project (same shape)
 *  GET /portfolio/efficiency  every project's Project Design Efficiencies (lib/efficiency.ts) for the management dashboard
 *
 * Bulk-loaded (a handful of queries for the whole portfolio), computed in ../portfolio/health.ts.
 */
import { db, type Row } from '../db/table.js'
import { query } from '../db/pool.js'
import { fail, ok, route } from '../http/router.js'
import { projectPortfolio, WEIGHTS } from '../portfolio/health.js'
import type { DprInput } from '../dpr/index.js'
import { EFF_GROUPS, EFF_ROWS, efficiencyValues } from '@/lib/efficiency'
import { isTestProject } from '@/lib/dataChecks'

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null)

/** every project's data as DPR inputs + its last change (bulk-loaded; also used by the comparison) */
export async function loadInputs(onlyId?: number) {
  const where = onlyId ? { id: onlyId } : {}
  const [projects, summaries, structure, mep, benchRows, audits] = await Promise.all([
    db.table<Row>('projects').where(where),
    db.table<Row>('designBriefSummaries', { spill: 'extra' }).where(onlyId ? { projectId: onlyId } : {}),
    db.table<Row>('designBriefInputs', { spill: 'fields', scope: { department: 'structure' } }).where(onlyId ? { projectId: onlyId } : {}),
    db.table<Row>('designBriefInputs', { spill: 'fields', scope: { department: 'mep' } }).where(onlyId ? { projectId: onlyId } : {}),
    db.table<Row>('benchmarks').all(),
    // latest change per project (design data, department inputs, project info) from the audit log
    query<{ projectId: number; createdAt: Date; creatorName: string }>(
      `SELECT projectId, createdAt, creatorName FROM (
         SELECT projectId, createdAt, creatorName, ROW_NUMBER() OVER (PARTITION BY projectId ORDER BY createdAt DESC) AS rn
         FROM dbo.auditLogs WHERE projectId IS NOT NULL AND taskType NOT IN ('User Login', 'User Logout')
       ) t WHERE rn = 1`,
    ),
  ])
  const benchmarks: NonNullable<DprInput['benchmarks']> = {}
  for (const b of benchRows) {
    const key = String(b.key)
    if (!key.startsWith('spec|')) benchmarks[key] = { benchmarkValue: (b.benchmarkValue as string) ?? '', validOptions: (b.validOptions as string[]) ?? [] }
  }
  const byProject = <T extends Row>(rows: T[]) => new Map(rows.map((r) => [Number(r.projectId), r]))
  const sMap = byProject(summaries)
  const stMap = byProject(structure)
  const mMap = byProject(mep)
  const aMap = new Map(audits.map((a) => [Number(a.projectId), a]))

  return projects.map((p) => {
    const id = Number(p.id)
    const s = sMap.get(id)
    const summary = s ? (Object.fromEntries(Object.entries(s).filter(([k, v]) => !(v === null && k.endsWith('Data')))) as Record<string, unknown>) : null
    const input: DprInput = {
      project: { ...(p as Record<string, unknown>), name: String(p.name ?? ''), location: String(p.location ?? ''), projectType: String(p.projectType ?? ''), category: String(p.category ?? '') },
      summary,
      structure: stMap.get(id) ?? null,
      mep: mMap.get(id) ?? null,
      benchmarks,
    }
    // last change: audit log entry, else the newest record timestamp
    const a = aMap.get(id)
    const stamps = [s?.updatedAt, stMap.get(id)?.updatedAt, mMap.get(id)?.updatedAt, p.updatedAt].map(iso).filter(Boolean).sort() as string[]
    const last = a ? { at: iso(a.createdAt), by: a.creatorName || null } : { at: stamps[stamps.length - 1] ?? null, by: null }
    return { input, last }
  })
}

async function loadAll(onlyId?: number) {
  return (await loadInputs(onlyId)).map(({ input, last }) => projectPortfolio(input, last))
}

route('GET', '/portfolio', async () => {
  const projects = await loadAll()
  return ok({ generatedAt: new Date().toISOString(), weights: WEIGHTS, projects })
})

route('GET', '/portfolio/efficiency', async () => {
  const [inputs, m1] = await Promise.all([loadInputs(), db.table<Row>('keyRatios').all()])
  const m1By = new Map(m1.map((r) => [Number(r.projectId), (r.fields ?? {}) as Record<string, unknown>]))
  const projects = inputs.map(({ input, last }) => {
    const p = input.project as Record<string, unknown>
    const id = Number(p.id)
    return {
      id,
      name: String(p.name ?? ''),
      portfolio: String(p.locationCategory ?? '') || 'Other',
      projectType: String(p.projectType ?? ''),
      category: String(p.category ?? ''),
      location: String(p.location ?? ''),
      isTest: isTestProject(String(p.name ?? '')),
      lastUpdate: last,
      values: efficiencyValues({ project: p, summary: input.summary as Record<string, unknown> | null, structure: input.structure, mep: input.mep, m1: m1By.get(id) ?? null }),
    }
  })
  return ok({ generatedAt: new Date().toISOString(), groups: EFF_GROUPS, rows: EFF_ROWS, projects })
})

route('GET', '/portfolio/:id', async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return fail(400, 'Invalid project id')
  const [p] = await loadAll(id)
  return p ? ok(p) : fail(404, 'Project not found')
})
