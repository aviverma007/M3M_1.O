/* Shared reference-data endpoints: dropdown option metadata and benchmarks. */
import { db } from '../db'
import { created, fail, ok, route } from '../router'

type Row = { id: number; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

/* ---------------- dropdown options (user-managed extras for SelectWithOther) ---------------- */
route('GET', '/metadata/dropdown-options/:fieldKey', ({ params }) =>
  ok(db.table<Row>('dropdownOptions').where((o) => o.fieldKey === params.fieldKey)),
)
route('POST', '/metadata/dropdown-options', ({ body }) => {
  if (!body?.fieldKey || !body?.optionValue) return fail(400, 'fieldKey and optionValue are required')
  const existing = db.table<Row>('dropdownOptions').first((o) => o.fieldKey === body.fieldKey && o.optionValue === body.optionValue)
  return existing ? ok(existing) : created(db.table<Row>('dropdownOptions').insert({ fieldKey: body.fieldKey, optionValue: body.optionValue }))
})
route('DELETE', '/metadata/dropdown-options/:id', ({ params }) => {
  db.table('dropdownOptions').remove(params.id)
  return ok(null, 'Option removed')
})

/* ---------------- benchmarks ----------------
 * Rows: { key (normalised label, see lib/benchmark normalizeKey), benchmarkValue, validOptions[] }.
 * Seed files add rows with registerBenchmarks() from seed/benchmarks-*.ts
 */
route('GET', '/benchmark', () => {
  const map: Record<string, { benchmarkValue: string; validOptions: string[] }> = {}
  db.table<Row>('benchmarks')
    .all()
    .forEach((b) => (map[b.key] = { benchmarkValue: b.benchmarkValue, validOptions: b.validOptions ?? [] }))
  return ok(map)
})
