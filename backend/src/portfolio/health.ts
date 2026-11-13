/*
 * Portfolio figures and the project health score (0–100).
 *
 * Health = weighted average of the parts that have data (weights re-normalised over those parts):
 *   Benchmarks   50%  share of benchmarked parameters within their benchmark (Module 6, Structure, MEP, Service Design —
 *                     the same checks and Req: values the DPR prints)
 *   Completeness 20%  share of the 15 DPR modules with data
 *   Approvals    15%  share of listed approvals received
 *   Schedule     15%  share of due approval milestones (planned date passed) met on time
 * 75+ = On track (green), 50–74 = Needs attention (amber), below 50 = At risk (red).
 */
import { projectFacts, type CompareInput } from '@/lib/projectComparison'
import { completeness, dataChecks, type DataIssue } from '@/lib/dataChecks'
import type { DprInput } from '../dpr/index.js'
import { formatBenchmark, getBenchmark, isDeviation, projectLevelChecks } from '../dpr/modules/project-level.js'
import { structureSections } from '../dpr/modules/structure.js'
import { mepSections } from '../dpr/modules/mep.js'
import { serviceDesignSections } from '../dpr/modules/service-design.js'

export const WEIGHTS = { benchmarks: 50, completeness: 20, approvals: 15, schedule: 15 } as const

export type Check = { module: string; label: string; value: string; unit?: string; req: string; ok: boolean }
/** field: label of the field to fix (the page scrolls to it) */
export type Problem = { kind: 'benchmark' | 'approval' | 'data'; module: string; text: string; severity: number; field?: string }

const num = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(x) ? x : null
}
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const day = (s: unknown) => {
  const d = new Date(String(s ?? ''))
  return String(s ?? '').trim() && !isNaN(d.getTime()) ? d : null
}

/** every benchmark check the DPR shows for this project */
export function benchmarkChecks(input: DprInput): Check[] {
  const out: Check[] = projectLevelChecks(input).map((c) => ({ module: 'Project Level Design', ...c }))
  const fromSections = (module: string, sections: { title: string; rows: { label: string; value: string; unit?: string; req?: string; ok?: boolean }[] }[]) => {
    for (const s of sections)
      for (const r of s.rows) {
        if (r.ok !== undefined && r.value && r.value !== '-') out.push({ module, label: r.label, value: r.value, unit: r.unit, req: r.req ?? 'as benchmark', ok: r.ok })
        // MEP rows without a printed Req: use the benchmark table, as the MEP form does ("No. Of Lifts per Tower — Min 2")
        else if (module === 'MEP' && r.ok === undefined && input.benchmarks) {
          const prefix = /passenger/i.test(s.title) ? 'passenger elevators' : /service/i.test(s.title) ? 'service elevators' : s.title
          const b = getBenchmark(`${prefix} ${r.label}`, input.benchmarks as never)
          const req = formatBenchmark(b)
          if (b && req && r.value && r.value !== '-') out.push({ module, label: `${s.title.replace(/^Elevators \((.*)\)$/, '$1 lifts')}: ${r.label}`, value: r.value, unit: r.unit, req, ok: !isDeviation(r.value, b) })
        }
      }
  }
  fromSections('Structure', structureSections(input))
  fromSections('MEP', mepSections(input))
  fromSections('Service Design', serviceDesignSections(input))
  // the same parameter printed on two Module 6 pages ("Basement B1 B2" / "Basement B1/B2") counts once
  const seen = new Set<string>()
  return out.filter((c) => {
    const k = `${c.module}|${c.label.toLowerCase().replace(/[^a-z0-9]/g, '')}|${c.value}`
    return seen.has(k) ? false : (seen.add(k), true)
  })
}

/** how far a value is from its requirement (0 = just outside, 1 = way off), for ranking problems */
function distance(value: string, req: string) {
  const v = num(value)
  if (v === null) return 0.2
  const range = req.match(/(-?[0-9]+(?:\.[0-9]+)?)\s*(?:to|[-–—])\s*(-?[0-9]+(?:\.[0-9]+)?)/i)
  const rel = (a: number, b: number) => Math.min(1, Math.abs(a - b) / Math.max(Math.abs(b), 1e-9))
  if (range) {
    const lo = parseFloat(range[1])
    const hi = parseFloat(range[2])
    return v < lo ? rel(v, lo) : v > hi ? rel(v, hi) : 0
  }
  const lim = req.match(/(max|min)\.?\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (lim) return rel(v, parseFloat(lim[2]))
  return 0.2
}

/** approvals: received, and milestones (submission / approval) that were due by today and whether they were met on time */
function approvalStatus(summary: Record<string, unknown> | null, today = new Date()) {
  const rows = arr(obj(summary).approvalsData).filter((a) => String(a.type ?? '').trim())
  const dated = rows.filter((a) => day(a.plannedApproval) || day(a.actualApproval) || day(a.plannedSubmission) || day(a.actualSubmission))
  const received = rows.filter((a) => day(a.actualApproval)).length
  let due = 0
  let onTime = 0
  const overdue: { type: string; stage: string; days: number }[] = []
  for (const a of rows) {
    for (const [stage, p, act] of [['submission', a.plannedSubmission, a.actualSubmission], ['approval', a.plannedApproval, a.actualApproval]] as const) {
      const planned = day(p)
      if (!planned || planned > today) continue
      due++
      const actual = day(act)
      if (actual && actual <= planned) onTime++
      else {
        const late = Math.round(((actual ?? today).getTime() - planned.getTime()) / 864e5)
        if (!actual) overdue.push({ type: String(a.type), stage, days: late })
        else if (late > 0) overdue.push({ type: String(a.type), stage: `${stage} (done late)`, days: late })
      }
    }
  }
  const rera = rows.find((a) => /rera/i.test(String(a.type)))
  return {
    listed: dated.length,
    received,
    due,
    onTime,
    overdue: overdue.sort((a, b) => b.days - a.days),
    rera: rera ? (day(rera.actualApproval) ? 'Approved' : day(rera.actualSubmission) ? 'Submitted' : 'Pending') : 'Not listed',
  }
}

export type ProjectHealth = ReturnType<typeof projectPortfolio>

/** everything the portfolio dashboard and the comparison need for one project */
export function projectPortfolio(input: DprInput, lastUpdate: { at: string | null; by: string | null }) {
  const ci: CompareInput = { project: input.project, summary: input.summary, structure: input.structure ?? null, mep: input.mep ?? null }
  const f = projectFacts(ci)
  const checks = benchmarkChecks(input)
  const comp = completeness(ci)
  const issues: DataIssue[] = dataChecks(ci)
  const appr = approvalStatus(input.summary)

  const parts = {
    benchmarks: checks.length ? (checks.filter((c) => c.ok).length / checks.length) * 100 : null,
    completeness: comp.pct,
    approvals: appr.listed ? (appr.received / appr.listed) * 100 : null,
    schedule: appr.due ? (appr.onTime / appr.due) * 100 : null,
  }
  let wsum = 0
  let acc = 0
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const v = parts[k as keyof typeof parts]
    if (v === null) continue
    wsum += w
    acc += w * v
  }
  // too little entered to judge: no benchmark checks and under 30% of the modules filled
  const noData = !checks.length && comp.pct < 30
  const score = noData ? null : wsum ? Math.round(acc / wsum) : 0
  const status = score === null ? 'no-data' : score >= 75 ? 'on-track' : score >= 50 ? 'attention' : 'at-risk'

  const problems: Problem[] = [
    ...issues.filter((i) => i.level === 'error').map((i): Problem => ({ kind: 'data', module: i.module, text: i.message, severity: 1.2, field: i.field })),
    ...appr.overdue.map((o): Problem => ({ kind: 'approval', module: 'Approvals', text: `${o.type} ${o.stage} overdue by ${o.days} days`, severity: 0.5 + Math.min(0.6, o.days / 365), field: o.type })),
    ...checks
      .filter((c) => !c.ok)
      .map((c): Problem => ({ kind: 'benchmark', module: c.module, field: c.label.replace(/^[^:]*lifts:\s*/, ''), text: `${c.label} ${c.value}${c.unit && /^[0-9.,-]+$/.test(c.value) ? ` ${c.unit}` : ''} vs ${c.req}`, severity: 0.3 + distance(c.value, c.req) * 0.7 })),
    ...issues.filter((i) => i.level === 'warning').map((i): Problem => ({ kind: 'data', module: i.module, text: i.message, severity: 0.25, field: i.field })),
  ].sort((a, b) => b.severity - a.severity)

  const gsv = f.saleable && f.price ? f.saleable * f.price : null
  const cost = f.bua && f.cost ? f.bua * f.cost : null
  const carpet = num(f.kr.carpetArea)
  return {
    id: Number(f.p.id),
    name: String(f.p.name ?? ''),
    location: String(f.p.location ?? ''),
    portfolio: String(f.p.locationCategory ?? '') || 'Unassigned',
    category: String(f.p.category ?? ''),
    projectType: String(f.p.projectType ?? ''),
    classification: String(f.p.projectClassification ?? ''),
    lastUpdate,
    metrics: {
      totalUnits: f.totalUnits || null,
      residentialUnits: f.resTotalUnits || null,
      saleable: f.saleable,
      siteAcres: num(f.p.site_area_acres ?? f.pd.totalArea),
      towers: num(f.pd.noOfTowers),
      gsv,
      cost,
      costPct: gsv && cost ? (cost / gsv) * 100 : null,
      carpetSaleable: carpet && f.saleable ? (carpet / f.saleable) * 100 : null,
      saleableFar: f.saleable && f.far ? f.saleable / f.far : null,
      buaSaleable: f.bua && f.saleable ? f.bua / f.saleable : null,
      // a permissible FAR entered as a ratio (2.5) instead of an area gives nonsense; leave it out (it is flagged as a data error)
      farUtil: f.far && f.pfar && f.far / f.pfar < 2 ? (f.far / f.pfar) * 100 : null,
      carsPerUnit: f.cars && f.units ? f.cars / f.units : null,
      cars: f.cars,
      salesPrice: f.price,
      costRate: f.cost,
    },
    approvals: { listed: appr.listed, received: appr.received, due: appr.due, onTime: appr.onTime, overdue: appr.overdue.length, rera: appr.rera },
    completeness: comp,
    checks: { total: checks.length, ok: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok) },
    dataIssues: issues,
    health: { score, status, parts, problems: problems.slice(0, 12) },
  }
}
