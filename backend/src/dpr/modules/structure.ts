/* Design Considerations — Structural Parameters (Structure department record, customFields). */
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { checkBenchmark, customLabel, inRange, isEmpty, num, oneOf, renderParamTable, show, type ParamRow, type ParamSection } from './param-table.js'

const TITLE = 'Design Considerations — Structural Parameters'

type Def = { name: string; label: string; unit?: string; req?: string; ok?: (v: unknown) => boolean | undefined }

const SECTIONS: { title: string; fields: Def[] }[] = [
  {
    title: 'Proposed Formwork',
    fields: [
      { name: 'towerAreaNonTypical', label: 'Tower Area - Non Typical Floors' },
      { name: 'towerAreaTypical', label: 'Tower Area - Typical Floors', req: 'Monolithic Aluminium Formwork (20 sets)', ok: (v) => oneOf(v, 'Monolithic Aluminium') },
      { name: 'nfa', label: 'NTA', req: 'Conventional', ok: (v) => oneOf(v, 'Conventional') },
      { name: 'commercial', label: 'Commercial', req: 'Conventional', ok: (v) => oneOf(v, 'Conventional') },
    ],
  },
  {
    title: 'Structural System Details',
    fields: [
      { name: 'earthquakeResistance', label: 'Earthquake Resistance', req: 'Seismic Zone IV', ok: (v) => show(v).toLowerCase() === 'seismic zone iv' },
      { name: 'structuralSystem', label: 'Structural System', req: 'Shear Wall System', ok: (v) => oneOf(v, 'Shear Wall System') },
      { name: 'typeOfStructure', label: 'Type Of Structure', req: 'Type 1', ok: (v) => show(v).toLowerCase() === 'type 1' },
      { name: 'typeOfConstruction', label: 'Type Of Construction', req: 'Aluminium Formwork (100mm int / 200mm ext)', ok: (v) => oneOf(v, 'Aluminium Formwork') },
      { name: 'expansionJoints', label: 'Non-Tower Area Expansion Joints', req: 'No expansion joints in NTA', ok: (v) => /^no\b/i.test(show(v)) },
      { name: 'designExecution', label: 'Design Execution', req: 'BIM + Tekla', ok: (v) => oneOf(v, 'BIM + Tekla') },
    ],
  },
  {
    title: 'Material & Consumption',
    fields: [
      { name: 'maxGradeOfConcrete', label: 'Max. Grade of Concrete', req: 'Not explicitly stated (inferred M50)', ok: (v) => num(v) <= 50 },
      { name: 'builtUpArea', label: 'Built Up Area', unit: 'Sq. ft' },
      { name: 'steelConsumptionCoefficient', label: 'Steel Consumption Coefficient', req: '6.1 to 6.5', ok: (v) => inRange(v, 6.1, 6.5) },
      { name: 'totalSteelConsumption', label: 'Total Steel Consumption', unit: 'Kg' },
      { name: 'concreteConsumptionCoefficient', label: 'Concrete Consumption Coefficient', req: '0 to 0.046', ok: (v) => inRange(v, 0, 0.046) },
      { name: 'totalConcreteConsumption', label: 'Total Concrete Consumption', unit: 'Cubic m' },
    ],
  },
]

type DynamicInput = { group?: string; name?: string; benchmark?: string; value?: unknown }

const structure: ModuleRenderer = (ctx, input) => {
  const rec = (input.structure ?? {}) as Record<string, unknown>
  const cf = { ...((rec.fields as Record<string, unknown>) ?? {}), ...((rec.customFields as Record<string, unknown>) ?? {}) }
  const values: Record<string, unknown> = { ...cf }
  // totals derived like the form when not stored
  const bua = num(values.builtUpArea)
  if (isEmpty(values.totalSteelConsumption) && bua && num(values.steelConsumptionCoefficient)) values.totalSteelConsumption = (bua * num(values.steelConsumptionCoefficient)).toFixed(2)
  if (isEmpty(values.totalConcreteConsumption) && bua && num(values.concreteConsumptionCoefficient))
    values.totalConcreteConsumption = (bua * num(values.concreteConsumptionCoefficient)).toFixed(2)

  const row = (d: Def): ParamRow => {
    const v = values[d.name]
    return { label: d.label, value: show(v), unit: d.unit, req: d.req, ok: d.req ? d.ok?.(v) : undefined }
  }
  const sections: ParamSection[] = SECTIONS.map((s) => ({ title: s.title, rows: s.fields.filter((f) => !isEmpty(values[f.name])).map(row) }))

  // custom inputs added on the page, grouped by their group name
  const dyn = (Array.isArray(cf.dynamicInputs) ? (cf.dynamicInputs as DynamicInput[]) : []).filter((d) => d.name && !isEmpty(d.value))
  const groups = new Map<string, ParamRow[]>()
  for (const d of dyn) {
    const g = String(d.group || '')
    const bench = String(d.benchmark ?? '').trim()
    const rowFor: ParamRow = { label: customLabel(String(d.name)), value: show(d.value), req: bench || undefined, ok: bench ? checkBenchmark(d.value, bench) : undefined }
    const existing = g ? sections.find((s) => s.title.toLowerCase() === g.toLowerCase()) : undefined
    if (existing) existing.rows.push(rowFor)
    else groups.set(g, [...(groups.get(g) ?? []), rowFor])
  }
  groups.forEach((rows, title) => sections.push({ title, rows }))

  if (!sections.some((s) => s.rows.length)) {
    contentPage(ctx, 'Design Considerations — Structural')
    emptyMessage(ctx, 'No structural parameters submitted yet.')
    return
  }
  renderParamTable(ctx, TITLE, ['Elements', 'Proposed Specifications'], sections)
}
export default structure
