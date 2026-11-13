/* Façade & Envelope — "Parameter | Details" table (system, glass, areas & cost) + calculated outputs. */
import { FACADE_SECTIONS, facadeContextOf, facadeOutputs, facadeText, type FacadeData } from '@/lib/facade'
import { fmtNum } from '@/lib/projectComparison'
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import type { DprInput } from '../index.js'
import { renderParamTable, type ParamRow, type ParamSection } from './param-table.js'

const TITLE = 'Façade & Envelope'

export function facadeSections(input: DprInput): ParamSection[] {
  const d = ((input.summary ?? {}) as Record<string, unknown>).facadeData as FacadeData | undefined
  if (!d) return []
  const sections: ParamSection[] = FACADE_SECTIONS.map((sec) => ({
    title: sec.title,
    rows: sec.fields
      .map((f): ParamRow | null => {
        const v = facadeText(d, f.key)
        if (!v) return null
        const numeric = /^-?[0-9.,]+$/.test(v)
        return { label: f.label, value: numeric ? fmtNum(parseFloat(v.replace(/,/g, '')), 3) : v, unit: numeric ? f.unit : undefined }
      })
      .filter((r): r is ParamRow => !!r),
  }))
  const o = facadeOutputs(d, facadeContextOf(input.summary, input.mep ?? null))
  const out: ParamRow[] = []
  const add = (label: string, v: number | null, unit: string, dp: number, note?: string) => {
    if (v !== null) out.push({ label, value: fmtNum(v, dp), unit, note })
  }
  add('Glazing %', o.glazingPct, '%', 1)
  add('Façade Cost', o.totalCost !== null ? o.totalCost / 1e7 : null, 'Rs. Cr', 2)
  add('Façade Cost per sq ft Saleable', o.costPerSaleable, 'Rs./sq ft', 0)
  add('Effective Glass Area (glazed × SHGC)', o.effectiveGlass, 'sq ft', 0)
  add('Heat-Gain Index', o.heatGainIndex, 'per 1,000 sq ft saleable', 1, 'Effective glass area per 1,000 sq ft of saleable area')
  add('Glass Load per TR of Cooling', o.glassPerTR, 'sq ft/TR', 1)
  if (out.length) sections.push({ title: 'Calculated Output', rows: out })
  if (d.remarks?.trim()) sections.push({ title: 'Remarks', rows: [{ label: 'Remarks', value: d.remarks.trim() }] })
  return sections.filter((s) => s.rows.length)
}

const facade: ModuleRenderer = (ctx, input) => {
  const sections = facadeSections(input)
  if (!sections.length) {
    contentPage(ctx, TITLE)
    emptyMessage(ctx, 'No façade details entered yet.')
    return
  }
  renderParamTable(ctx, TITLE, ['Parameter', 'Details'], sections)
}
export default facade
