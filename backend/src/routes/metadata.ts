/* Reference-data endpoints — port of frontend/src/mock/handlers/metadata.ts */
import { db, type Row } from '../db/table.js'
import { created, fail, ok, route } from '../http/router.js'

route('GET', '/metadata/dropdown-options/:fieldKey', async ({ params }) => ok(await db.table<Row>('dropdownOptions').where({ fieldKey: params.fieldKey })))

route('POST', '/metadata/dropdown-options', async ({ body }) => {
  if (!body?.fieldKey || !body?.optionValue) return fail(400, 'fieldKey and optionValue are required')
  const t = db.table<Row>('dropdownOptions')
  const existing = await t.first({ fieldKey: String(body.fieldKey), optionValue: String(body.optionValue) })
  return existing ? ok(existing) : created(await t.insert({ fieldKey: String(body.fieldKey), optionValue: String(body.optionValue) }))
})

route('DELETE', '/metadata/dropdown-options/:id', async ({ params }) => {
  await db.table('dropdownOptions').remove(params.id)
  return ok(null, 'Option removed')
})

/** Benchmark map: normalised field label -> { benchmarkValue, validOptions } (spec| rows are Common Area catalogue answers, see below) */
route('GET', '/benchmark', async () => {
  const map: Record<string, { benchmarkValue: string; validOptions: string[] }> = {}
  for (const b of await db.table<Row>('benchmarks').all()) {
    if (String(b.key).startsWith('spec|')) continue
    map[b.key] = { benchmarkValue: b.benchmarkValue ?? '', validOptions: b.validOptions ?? [] }
  }
  return ok(map)
})

/**
 * PUT /benchmark (super admin) — upsert benchmark rows: { entries: { <key>: { benchmarkValue, validOptions? } }, remove?: [<key>] }.
 * Used by the project import to load the original application's benchmark values.
 * Keys "spec|<moduleNumber>|<chapterNumber>|<section title>|<field>|<categoryAns>" hold specification benchmark answers
 * (validOptions = accepted answers) used for the Req: lines of the Common Area report.
 */
route('PUT', '/benchmark', async ({ body, user }) => {
  if (!user || !['super_admin', 'superadmin', 'admin'].includes(String(user.role).toLowerCase())) return fail(403, 'Only a super admin can change benchmarks')
  const entries = body?.entries && typeof body.entries === 'object' ? (body.entries as Record<string, { benchmarkValue?: unknown; validOptions?: unknown }>) : {}
  const t = db.table<Row>('benchmarks')
  let n = 0
  for (const [key, v] of Object.entries(entries)) {
    const k = String(key).slice(0, 500)
    if (!k) continue
    const row = {
      key: k,
      benchmarkValue: v?.benchmarkValue == null ? '' : String(v.benchmarkValue),
      validOptions: Array.isArray(v?.validOptions) ? (v.validOptions as unknown[]).map(String) : [],
    }
    const existing = await t.first({ key: k })
    if (existing) await t.update(existing.id, row)
    else await t.insert(row)
    n++
  }
  // remove: keys to delete (placeholder values the original application doesn't have)
  let removed = 0
  for (const key of Array.isArray(body?.remove) ? (body.remove as unknown[]).map(String) : []) {
    if (key in entries) continue
    const existing = await t.first({ key })
    if (existing) {
      await t.remove(existing.id)
      removed++
    }
  }
  return ok({ updated: n, removed }, `${n} benchmark(s) saved, ${removed} removed`)
})
