/*
 * Façade & Envelope — consolidated output, a systems overview table, then one "Parameter | Details" table per façade system
 * (only the fields that apply to that system, i.e. the ones the form shows).
 */
import { SECTIONS, facadeContextOf, facadeSummary, fieldText, normalizeFacade, sectionVisible, systemOutputs, systemTitle, visible } from '@/lib/facade'
import { fmtNum } from '@/lib/projectComparison'
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import type { DprInput } from '../index.js'
import { renderParamTable, type ParamRow, type ParamSection } from './param-table.js'
import { drawTable, TABLE_TOP } from './cs-table.js'

const TITLE = 'Façade & Envelope'
const d2 = (v: number | null, dp: number) => (v === null ? '' : fmtNum(v, dp))

/** project-level rows + per-system sections (also used by the portfolio health checks / tests) */
export function facadeSections(input: DprInput): ParamSection[] {
  const data = normalizeFacade(((input.summary ?? {}) as Record<string, unknown>).facadeData)
  if (!data.systems.length) return []
  const ctx = facadeContextOf(input.summary)
  const sum = facadeSummary(data, ctx)
  const out: ParamRow[] = []
  const add = (label: string, v: string, unit?: string, note?: string) => {
    if (v) out.push({ label, value: v, unit, note })
  }
  add('Façade Systems', String(sum.systems))
  add('Total Façade Area', d2(sum.facadeArea, 0), 'sq ft')
  add('Total Glazed Area', d2(sum.glazedArea, 0), 'sq ft')
  add('Total Opaque Area', d2(sum.opaqueArea, 0), 'sq ft')
  add('Glazing % / WWR', d2(sum.wwr, 1), '%')
  add('Average SHGC (area-weighted)', d2(sum.avgShgc, 2))
  add('Glass U-Value (centre of glass, area-weighted)', d2(sum.avgUCentre, 2), 'W/m²K')
  add('SHGC-Weighted Glazed Area', d2(sum.shgcWeightedArea, 0), 'sq ft')
  add('Façade Cost', d2(sum.costCr, 2), 'Rs. Cr', sum.mixedScope ? `Mixed cost bases — ${sum.mixedScope}` : undefined)
  add('Façade Cost per sq ft of Façade Area', d2(sum.costPerSqftFacade, 0), 'Rs./sq ft')
  add('Façade Cost per sq ft of Saleable Area', d2(sum.costPerSqftSaleable, 0), 'Rs./sq ft')

  const sections: ParamSection[] = [{ title: 'Calculated Output — all façade systems', rows: out }]
  data.systems.forEach((s, i) => {
    const o = systemOutputs(s, ctx.saleable)
    for (const sec of SECTIONS) {
      if (!sectionVisible(sec, s)) continue
      const rows: ParamRow[] = sec.fields
        .filter((f) => visible(f, s))
        .map((f): ParamRow | null => {
          const v = fieldText(s, f)
          if (!v) return null
          const numeric = f.type === 'number' && /^-?[0-9.,]+$/.test(v)
          return { label: f.label, value: numeric ? fmtNum(parseFloat(v.replace(/,/g, '')), 3) : v, unit: numeric ? f.unit : undefined }
        })
        .filter((r): r is ParamRow => !!r)
      if (sec.id === 'C') {
        if (o.wwr !== null) rows.push({ label: 'WWR (this system)', value: fmtNum(o.wwr, 1), unit: '%' })
        if (o.opaquePct !== null) rows.push({ label: 'Opaque % (this system)', value: fmtNum(o.opaquePct, 1), unit: '%' })
      }
      if (sec.id === 'D') {
        if (o.costPerSqftFacade !== null) rows.push({ label: 'Cost per sq ft of Façade Area', value: fmtNum(o.costPerSqftFacade, 0), unit: 'Rs./sq ft' })
        if (o.costPerSqftSaleable !== null) rows.push({ label: 'Cost per sq ft of Saleable Area', value: fmtNum(o.costPerSqftSaleable, 0), unit: 'Rs./sq ft' })
        if (o.glassCostPerSqft !== null) rows.push({ label: 'Glass Cost per sq ft of Glazed Area', value: fmtNum(o.glassCostPerSqft, 0), unit: 'Rs./sq ft' })
      }
      if (sec.id === 'E' && s.documents?.length) rows.push({ label: 'Supporting documents', value: s.documents.map((d) => d.name).join(', ') })
      if (rows.length) sections.push({ title: `${systemTitle(s, i)} · ${sec.title.replace(/^[A-E][0-9]? · /, '')}`, rows })
    }
    if (s.remarks?.trim()) sections.push({ title: `${systemTitle(s, i)} · Remarks`, rows: [{ label: 'Remarks', value: s.remarks.trim() }] })
  })
  if (data.remarks?.trim()) sections.push({ title: 'Project Remarks', rows: [{ label: 'Remarks', value: data.remarks.trim() }] })
  return sections.filter((x) => x.rows.length)
}

const facade: ModuleRenderer = (ctx, input) => {
  const data = normalizeFacade(((input.summary ?? {}) as Record<string, unknown>).facadeData)
  if (!data.systems.length) {
    contentPage(ctx, TITLE)
    emptyMessage(ctx, 'No façade systems entered yet.')
    return
  }
  // overview of the systems
  const saleable = facadeContextOf(input.summary).saleable
  const page = () => {
    contentPage(ctx, `${TITLE} — Façade Systems`)
    return TABLE_TOP
  }
  page()
  drawTable(
    ctx,
    [
      { label: 'System', width: 200 },
      { label: 'Glazing', width: 55 },
      { label: 'Wall Area (sq ft)', width: 80 },
      { label: 'Glazed (sq ft)', width: 75 },
      { label: 'WWR %', width: 50 },
      { label: 'U / SHGC / VLT', width: 85 },
      { label: 'Cost (Rs. Cr)', width: 65 },
      { label: 'Rs./sq ft', width: 55 },
      { label: 'Design Stage', width: 106 },
    ],
    data.systems.map((s, i) => {
      const o = systemOutputs(s, saleable)
      return [
        systemTitle(s, i),
        (s.glazingConfig ?? '').split(' ')[0] || '-',
        o.wall === null ? '-' : fmtNum(o.wall, 0),
        o.glazed === null ? '-' : fmtNum(o.glazed, 0),
        o.wwr === null ? '-' : fmtNum(o.wwr, 1),
        [s.uCentre, s.shgc, s.vlt].map((x) => x || '-').join(' / '),
        o.costCr === null ? '-' : fmtNum(o.costCr, 2),
        o.costPerSqftFacade === null ? '-' : fmtNum(o.costPerSqftFacade, 0),
        s.designStage || '-',
      ]
    }),
    TABLE_TOP,
    page,
  )
  renderParamTable(ctx, TITLE, ['Parameter', 'Details'], facadeSections(input))
}
export default facade
