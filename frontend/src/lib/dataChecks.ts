/*
 * Data quality for a project ("reliable numbers"): sanity checks on the figures people enter and how complete the
 * project is. Pure — used by the entry forms (warnings while typing), the portfolio dashboard and the health score.
 */
import { num, projectFacts, type CompareInput } from '@/lib/projectComparison'
import { fmtIN } from '@/lib/format'

/** demo / test projects (left out of the owner view and portfolio averages by default) */
export const isTestProject = (name: string) => /\b(test|testing|demo|sample|dummy)\b/i.test(name)

export type DataIssue = {
  level: 'error' | 'warning'
  /** module the figure belongs to (where to fix it) */
  module: string
  message: string
}

const SQM_PER_ACRE = 4046.86
const SQFT_PER_SQM = 10.7639
const pctDiff = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])

/** site area that is far too big to be acres (someone typed square metres) */
export function siteAreaIssue(acres: unknown): DataIssue | null {
  const a = num(acres)
  if (a === null || a <= 200) return null
  return {
    level: 'error',
    module: 'Project Info',
    message: `Site area ${fmtIN(a)} acres looks like square metres (${fmtIN(a)} sq m = ${fmtIN(a / SQM_PER_ACRE)} acres).`,
  }
}

/** every check for one project */
export function dataChecks(x: CompareInput): DataIssue[] {
  const f = projectFacts(x)
  const out: DataIssue[] = []
  const push = (level: DataIssue['level'], module: string, message: string) => out.push({ level, module, message })

  const site = siteAreaIssue(f.p.site_area_acres ?? f.pd.totalArea)
  if (site) out.push(site)
  const acres = num(f.p.site_area_acres)
  const sqm = num(f.p.site_area)
  if (acres && sqm && Math.abs(pctDiff(acres * SQM_PER_ACRE, sqm)) > 5)
    push('warning', 'Project Info', `Site area ${fmtIN(acres)} acres and ${fmtIN(sqm)} sq m don't match (${fmtIN(acres * SQM_PER_ACRE)} sq m expected).`)

  // Module 5 vs Module 6
  const m6Sale = num(f.kr.saleableArea)
  if (m6Sale && f.resTotalArea && Math.abs(pctDiff(m6Sale, f.resTotalArea)) > 10)
    push(
      'warning',
      'Project Level Design',
      `Saleable area ${fmtIN(m6Sale)} sq ft differs from the Module 5 residential total ${fmtIN(f.resTotalArea)} sq ft (${pctDiff(m6Sale, f.resTotalArea) > 0 ? '+' : ''}${pctDiff(m6Sale, f.resTotalArea).toFixed(0)}%).`,
    )
  const m6Units = num(f.kr.noOfUnits)
  if (m6Units && f.resTotalUnits && Math.abs(pctDiff(m6Units, f.resTotalUnits)) > 5)
    push('warning', 'Project Level Design', `No. of units ${fmtIN(m6Units)} differs from the Module 5 residential units ${fmtIN(f.resTotalUnits)}.`)

  // permissible FAR: Module 6 (sq ft) vs project record (sq m)
  const pfar6 = num(f.kr.permissibleFAR)
  const pfarP = num(f.p.far_permissible)
  if (pfar6 && pfarP && Math.abs(pctDiff(pfar6, pfarP * SQFT_PER_SQM)) > 2)
    push('warning', 'Project Level Design', `Permissible FAR ${fmtIN(pfar6)} sq ft doesn't match the project's ${fmtIN(pfarP)} sq m (= ${fmtIN(pfarP * SQFT_PER_SQM, 0)} sq ft).`)

  // area relationships that can't be true
  const carpet = num(f.kr.carpetArea)
  const bua = f.bua
  const far = f.far
  if (carpet && f.saleable && carpet > f.saleable) push('error', 'Project Level Design', `Carpet area ${fmtIN(carpet)} is larger than saleable area ${fmtIN(f.saleable)}.`)
  if (bua && far && bua < far * 0.95) push('error', 'Project Level Design', `Built-up area ${fmtIN(bua)} is smaller than FAR ${fmtIN(far)}.`)

  // ratios outside a sane range (usually a typo or a unit mix-up)
  const ratio = (label: string, v: number | null, lo: number, hi: number, unit = '') => {
    if (v === null || !Number.isFinite(v)) return
    if (v < lo || v > hi) push('warning', 'Project Level Design', `${label} ${fmtIN(v)}${unit} is outside the usual ${lo}${unit}–${hi}${unit}; check the inputs.`)
  }
  if (carpet && f.saleable) ratio('Carpet / Saleable', (carpet / f.saleable) * 100, 30, 90, '%')
  if (bua && f.saleable) ratio('BUA / Saleable', bua / f.saleable, 0.8, 2.5)
  if (f.saleable && far) ratio('Saleable / FAR', f.saleable / far, 0.8, 3)
  if (far && f.pfar && far / f.pfar >= 2)
    push('error', 'Project Level Design', `Permissible FAR ${fmtIN(f.pfar)} sq ft is far below the FAR achieved (${fmtIN(far)} sq ft); it looks like a FAR ratio, not an area.`)
  else if (far && f.pfar) ratio('FAR utilisation', (far / f.pfar) * 100, 50, 110, '%')

  // heights typed in millimetres (3450 instead of 3.45 m)
  const mm = Object.entries(f.kr).filter(([k, v]) => /height/i.test(k) && k !== 'buildingHeight' && (num(v) ?? 0) > 20)
  if (mm.length)
    push('error', 'Project Level Design', `${mm.length} floor height(s) look like millimetres, e.g. ${fmtIN(num(mm[0][1]))} m (${mm[0][0].replace(/([A-Z])/g, ' $1').toLowerCase()}); enter metres (${fmtIN((num(mm[0][1]) ?? 0) / 1000)} m).`)
  const bh = num(f.kr.buildingHeight ?? f.pd.towerHeight)
  if (bh !== null && bh > 600) push('error', 'Project Level Design', `Building height ${fmtIN(bh)} m looks like millimetres or feet.`)

  // Module 5 rows with half the numbers
  const half = arr(f.pd.tableRows)
    .filter((g) => /resid/i.test(String(g.type ?? '')))
    .flatMap((g) => arr(g.units))
    .filter((u) => (num(u.count) !== null) !== (num(u.size) !== null) && String(u.type ?? '').trim())
  if (half.length) push('warning', 'Project Details', `${half.length} unit type(s) have a unit count or a size but not both (e.g. "${String(half[0].type).trim()}").`)

  return out
}

/* ------------------------------------------------------------------ completeness */
const filled = (v: unknown): boolean => {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim() !== '' && v.trim() !== '-'
  if (typeof v === 'number' || typeof v === 'boolean') return true
  if (Array.isArray(v)) return v.some(filled)
  return Object.entries(v as object).some(([k, x]) => !k.startsWith('__') && k !== 'id' && filled(x))
}

/** the 15 DPR modules and whether each has data */
export function completeness(x: CompareInput) {
  const s = obj(x.summary)
  const pd = obj(s.projectDetailsLayoutData)
  const pl = obj(s.projectLevelDesignData)
  const deptHas = (r: unknown) => {
    const o = obj(r)
    return filled(o.customFields) || filled(o.fields) || ['structuralSystem', 'passengerLiftsNo', 'acProvisionUnits'].some((k) => filled(o[k]))
  }
  const modules: [string, boolean][] = [
    ['Project Details', arr(pd.tableRows).some((g) => arr(g.units).some((u) => filled(u.count)))],
    ['Unit Level Design', arr(s.unitLevelDesignData).length > 0],
    ['Project Level Design', filled(obj(pl.keyRatioInputs).saleableArea)],
    ['Structure', deptHas(x.structure)],
    ['MEP', deptHas(x.mep)],
    ['ID Specifications', filled(s.idSpecificationsData)],
    ['Common Area', filled(s.commonAreaData)],
    ['Landscape & Amenities', filled(obj(s.landscapeAmenitiesData).landscapeData) || arr(obj(s.landscapeAmenitiesData).selectedAmenities).length > 0],
    ['Service Design', filled(s.serviceDesignData)],
    ['Contracting Strategy', arr(obj(s.contractingStrategyData).packages).some((p) => arr(p.elements).length > 0)],
    ['Consultant Strategy', arr(s.consultantStrategyData).some((c) => filled(c.name))],
    ['Phasing Plan', arr(s.phasingPlanData).some((p) => filled(p.name) && (filled(p.noOfUnits) || filled(p.siteArea)))],
    ['Project Schedule', arr(obj(s.projectScheduleData).schedules).some((t) => filled(t.start) || filled(t.finish))],
    ['Approvals', arr(s.approvalsData).some((a) => filled(a.plannedApproval) || filled(a.actualApproval) || filled(a.actualSubmission))],
    ['Additional Details', arr(s.additionalProjectDetailsData).some((a) => filled(a.description) && !/^comprehensive site logistics|^summary of critical project/i.test(String(a.description)))],
  ]
  const done = modules.filter(([, ok]) => ok).map(([m]) => m)
  return { pct: Math.round((done.length / modules.length) * 100), filled: done, missing: modules.filter(([, ok]) => !ok).map(([m]) => m), total: modules.length }
}
