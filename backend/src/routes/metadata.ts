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

/** Benchmark map: normalised field label -> { benchmarkValue, validOptions } */
route('GET', '/benchmark', async () => {
  const map: Record<string, { benchmarkValue: string; validOptions: string[] }> = {}
  for (const b of await db.table<Row>('benchmarks').all()) map[b.key] = { benchmarkValue: b.benchmarkValue ?? '', validOptions: b.validOptions ?? [] }
  return ok(map)
})
