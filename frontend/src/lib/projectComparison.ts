/*
 * Module 21 "Comparison": management comparison of two projects.
 * Pure logic shared by the Comparison page and the PDF export (backend imports it through the @/ alias),
 * so the screen and the PDF always show the same rows, values and winners.
 */
import { comparisonRatios } from '@/components/design-chapters/project-level/calc'
import { SERVICE_DESIGN } from '@/components/design-chapters-b/serviceCatalogue'
import { parkingRequired } from '@/lib/parkingRequired'
import type { ProjectLevelDesignData } from '@/types/chapters-a'

type Obj = Record<string, unknown>

/** everything one side of the comparison needs (GET /comparison/pair returns { a, b } of these) */
export type CompareInput = {
  project: Obj
  summary: Obj | null
  structure: Obj | null
  mep: Obj | null
}

/** higher = bigger value wins, lower = smaller value wins, undefined = information only (no winner) */
export type Better = 'higher' | 'lower'

export type CompareRow = {
  label: string
  unit?: string
  a: string
  b: string
  /** numeric values when both sides are numbers (drive the bars and the difference) */
  an: number | null
  bn: number | null
  better?: Better
  winner: 'a' | 'b' | 'tie' | null
  /** (b - a) / |a| in %, when both numeric and a ≠ 0 */
  deltaPct: number | null
}

export type CompareSection = { key: string; title: string; rows: CompareRow[] }

export type CompareKpi = { label: string; unit?: string; an: number | null; bn: number | null; a: string; b: string }

export type Comparison = {
  a: { id: string; name: string; location: string; category: string; projectType: string; portfolio: string; classification: string }
  b: { id: string; name: string; location: string; category: string; projectType: string; portfolio: string; classification: string }
  kpis: CompareKpi[]
  sections: CompareSection[]
  score: { a: number; b: number; tie: number; measured: number }
}

/* ------------------------------------------------------------------ helpers */
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const arr = <T = Obj>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
export const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null
  const x = parseFloat(String(v).replace(/,/g, '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(x) ? x : null
}
const yesNo = (v: unknown) => (v === true || v === 'true' ? 'Yes' : v === false || v === 'false' ? 'No' : str(v))

/** Indian digit grouping, at most 2 decimals ("31,79,765.02") */
export function fmtNum(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-'
  return n.toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: 0 })
}

function row(label: string, av: unknown, bv: unknown, opts: { unit?: string; better?: Better; dp?: number; text?: boolean } = {}): CompareRow | null {
  const an = opts.text ? null : num(av)
  const bn = opts.text ? null : num(bv)
  const a = opts.text || an === null ? yesNo(av) : fmtNum(an, opts.dp)
  const b = opts.text || bn === null ? yesNo(bv) : fmtNum(bn, opts.dp)
  if (!a && !b) return null
  const bothNum = an !== null && bn !== null
  let winner: CompareRow['winner'] = null
  if (bothNum && opts.better) winner = an === bn ? 'tie' : (opts.better === 'higher') === an! > bn! ? 'a' : 'b'
  const deltaPct = bothNum && an !== 0 ? ((bn! - an!) / Math.abs(an!)) * 100 : null
  return { label, unit: opts.unit, a: a || '-', b: b || '-', an, bn, better: opts.better, winner, deltaPct }
}

/* ------------------------------------------------------------------ per-project facts */
type UnitRow = { type?: unknown; count?: unknown; size?: unknown; area?: unknown }
type Group = { type?: unknown; units?: unknown }

function facts(x: CompareInput) {
  const p = x.project
  const s = obj(x.summary)
  const pd = obj(s.projectDetailsLayoutData)
  const pl = obj(s.projectLevelDesignData) as ProjectLevelDesignData & Obj
  const kr = obj(pl.keyRatioInputs)
  const other = obj(obj(pl.additionalElements2).other)
  const groups = arr<Group>(pd.tableRows)
  const allUnits = groups.flatMap((g) => arr<UnitRow>(g.units).map((u) => ({ ...u, group: str(g.type) })))
  const resGroups = groups.filter((g) => /resid/i.test(str(g.type)))
  const resUnits = (resGroups.length ? resGroups : groups).flatMap((g) => arr<UnitRow>(g.units))
  const unitArea = (u: UnitRow) => num(u.area) ?? (num(u.count) ?? 0) * (num(u.size) ?? 0)
  const sum = (list: UnitRow[], f: (u: UnitRow) => number | null) => list.reduce((t, u) => t + (f(u) ?? 0), 0)

  // unit mix by bedroom count
  const mix = new Map<string, { units: number; area: number }>()
  for (const u of resUnits) {
    const t = str(u.type)
    const m = /(\d)\s*\.?\s*5?\s*BHK/i.exec(t)
    const key = /pent\s*house|\bph\b/i.test(t) ? 'Penthouse' : m ? `${m[1]} BHK` : /studio|1\s*rk/i.test(t) ? 'Studio' : 'Other'
    const e = mix.get(key) ?? { units: 0, area: 0 }
    e.units += num(u.count) ?? 0
    e.area += unitArea(u)
    mix.set(key, e)
  }

  const totalUnits = sum(allUnits, (u) => num(u.count))
  const resTotalUnits = sum(resUnits, (u) => num(u.count))
  const resTotalArea = sum(resUnits, unitArea)

  const ratios = comparisonRatios(pl)
  const saleable = num(kr.saleableArea) ?? (resTotalArea || null)
  const far = num(kr.far)
  const pfar = num(kr.permissibleFAR) ?? (num(p.far_permissible) !== null ? num(p.far_permissible)! * 10.7639 : null)
  const cars = num(kr.totalNumberOfCars) ?? num(other.noOfParkingSlots)
  const price = num(kr.salesPrice)
  const cost = num(kr.constructionCostOnBUA)
  const bua = num(kr.builtUpArea)
  const units = num(kr.noOfUnits) ?? (resTotalUnits || null)

  // unit level design: weighted carpet / saleable efficiency
  const uld = arr(s.unitLevelDesignData)
  const uldW = uld.reduce((t, u) => t + (num(u.noOfUnits) ?? 1), 0)
  const uldEff = uld.length
    ? uld.reduce((t, u) => {
        const sa = num(u.saleableArea)
        const ca = num(u.carpetArea)
        return t + (sa && ca ? (ca / sa) * 100 * (num(u.noOfUnits) ?? 1) : 0)
      }, 0) / (uldW || 1)
    : null

  // structure / MEP department records (values live in the record, in fields{} or customFields{})
  const rec = (r: Obj | null) => {
    const o = obj(r)
    return { ...obj(o.fields), ...obj(o.customFields), ...o } as Obj
  }
  const st = rec(x.structure)
  const mp = rec(x.mep)

  // landscape & amenities
  const la = obj(s.landscapeAmenitiesData)
  const ld = obj(la.landscapeData)
  const amenities = arr<unknown>(la.selectedAmenities).length

  // service design: parameters within benchmark
  const sd = obj(s.serviceDesignData)
  let sdFilled = 0
  let sdOk = 0
  for (const c of SERVICE_DESIGN)
    for (const prm of c.parameters) {
      const v = sd[prm.name]
      if (v === undefined || v === '') continue
      sdFilled++
      if (String(v) === String(prm.benchmark)) sdOk++
    }

  // consultants, approvals, schedule, contracting, phasing
  const cons = arr(s.consultantStrategyData)
  const consNamed = cons.filter((c) => str(c.name) || str(c.status))
  const appointed = cons.filter((c) => /^appointed$/i.test(str(c.status))).length
  const appr = arr(s.approvalsData).filter((a) => str(a.type))
  const received = appr.filter((a) => str(a.actualApproval)).length
  const rera = appr.find((a) => /rera/i.test(str(a.type)))
  const sch = obj(s.projectScheduleData)
  const secs = arr(sch.sections)
  const starts = secs.map((x2) => str(x2.start)).filter(Boolean).sort()
  const ends = secs.map((x2) => str(x2.finish)).filter(Boolean).sort()
  const months = secs.reduce((m, x2) => Math.max(m, num(x2.durationMonths) ?? 0), 0)
  const cs = obj(s.contractingStrategyData)
  const packages = arr(cs.packages).length
  const phases = arr(s.phasingPlanData).length

  return {
    p, pd, kr, other, mix, totalUnits, resTotalUnits, resTotalArea, ratios, saleable, far, pfar, cars, price, cost, bua, units,
    uld, uldEff, st, mp, ld, amenities, sdFilled, sdOk, cons: consNamed.length, appointed, apprTotal: appr.length, received, rera,
    start: starts[0] ?? '', end: ends[ends.length - 1] ?? '', months, packages, phases, pl,
  }
}

const pctOf = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null)
const ratioNum = (s: string | undefined) => num(String(s ?? '').replace('%', ''))
const fmtDate = (s: string) => {
  const d = new Date(s)
  return s && !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : s
}

/* ------------------------------------------------------------------ comparison */
export function buildComparison(A: CompareInput, B: CompareInput): Comparison {
  const a = facts(A)
  const b = facts(B)
  const head = (f: ReturnType<typeof facts>) => ({
    id: str(f.p.id),
    name: str(f.p.name),
    location: str(f.p.location),
    category: str(f.p.category),
    projectType: str(f.p.projectType),
    portfolio: str(f.p.locationCategory),
    classification: str(f.p.projectClassification),
  })

  const S: CompareSection[] = []
  const add = (key: string, title: string, rows: (CompareRow | null)[]) => {
    const r = rows.filter((x): x is CompareRow => !!x)
    if (r.length) S.push({ key, title, rows: r })
  }

  add('overview', 'Project Overview', [
    row('Location', a.p.location, b.p.location, { text: true }),
    row('Portfolio', a.p.locationCategory, b.p.locationCategory, { text: true }),
    row('Category', a.p.category, b.p.category, { text: true }),
    row('Classification', a.p.projectClassification, b.p.projectClassification, { text: true }),
    row('Site Area', a.p.site_area_acres ?? a.pd.totalArea, b.p.site_area_acres ?? b.pd.totalArea, { unit: 'Acres' }),
    row('No. of Towers', a.pd.noOfTowers, b.pd.noOfTowers),
    row('Building Height', a.kr.buildingHeight ?? a.pd.towerHeight, b.kr.buildingHeight ?? b.pd.towerHeight, { unit: 'm' }),
    row('Total Units (all types)', a.totalUnits || null, b.totalUnits || null),
    row('Residential Units', a.resTotalUnits || null, b.resTotalUnits || null),
    row('Residential Saleable Area', a.resTotalArea || null, b.resTotalArea || null, { unit: 'sq ft' }),
    row('Avg. Unit Size (Residential)', a.resTotalUnits ? a.resTotalArea / a.resTotalUnits : null, b.resTotalUnits ? b.resTotalArea / b.resTotalUnits : null, { unit: 'sq ft', dp: 0 }),
    row('Units per Acre', density(a), density(b), { unit: 'units/acre', dp: 1 }),
  ])

  const keys = [...new Set([...a.mix.keys(), ...b.mix.keys()])].sort((x, y) => order(x) - order(y))
  add(
    'mix',
    'Unit Mix (Residential)',
    keys.flatMap((k) => {
      const ma = a.mix.get(k)
      const mb = b.mix.get(k)
      return [
        row(`${k} — Units`, ma?.units ?? null, mb?.units ?? null),
        row(`${k} — Share of Units`, ma && a.resTotalUnits ? (ma.units / a.resTotalUnits) * 100 : null, mb && b.resTotalUnits ? (mb.units / b.resTotalUnits) * 100 : null, { unit: '%', dp: 1 }),
        row(`${k} — Avg. Size`, ma?.units ? ma.area / ma.units : null, mb?.units ? mb.area / mb.units : null, { unit: 'sq ft', dp: 0 }),
      ]
    }),
  )

  add('area', 'Area & FAR', [
    row('Saleable Area', a.saleable, b.saleable, { unit: 'sq ft' }),
    row('Carpet Area', a.kr.carpetArea, b.kr.carpetArea, { unit: 'sq ft' }),
    row('Built Up Area', a.bua, b.bua, { unit: 'sq ft' }),
    row('FAR Achieved', a.far, b.far, { unit: 'sq ft' }),
    row('Permissible FAR', a.pfar, b.pfar, { unit: 'sq ft', dp: 0 }),
    row('FAR Utilisation', a.far && a.pfar ? (a.far / a.pfar) * 100 : null, b.far && b.pfar ? (b.far / b.pfar) * 100 : null, { unit: '%', better: 'higher' }),
    row('Balcony Area', a.kr.balconyArea, b.kr.balconyArea, { unit: 'sq ft' }),
    row('Balcony Area / FAR', a.far ? pctOf(num(a.kr.balconyArea) ?? 0, a.far) : null, b.far ? pctOf(num(b.kr.balconyArea) ?? 0, b.far) : null, { unit: '%' }),
    row('Total Basement Area', a.kr.totalBasementArea, b.kr.totalBasementArea, { unit: 'sq ft' }),
  ])

  add('efficiency', 'Design Efficiency', [
    row('Carpet / Saleable', ratioNum(a.ratios.carpetSaleable), ratioNum(b.ratios.carpetSaleable), { unit: '%', better: 'higher' }),
    row('Saleable / FAR', a.saleable && a.far ? a.saleable / a.far : null, b.saleable && b.far ? b.saleable / b.far : null, { better: 'higher' }),
    row('BUA / Saleable', a.bua && a.saleable ? a.bua / a.saleable : null, b.bua && b.saleable ? b.bua / b.saleable : null, { better: 'lower' }),
    row('BUA / FAR', a.bua && a.far ? a.bua / a.far : null, b.bua && b.far ? b.bua / b.far : null, { better: 'lower' }),
    row('Core Efficiency (Shaft / FAR)', ratioNum(a.ratios.coreEfficiency), ratioNum(b.ratios.coreEfficiency), { unit: '%', better: 'lower' }),
    row('Loading Factor', ratioNum(a.ratios.loadingFactor), ratioNum(b.ratios.loadingFactor)),
    row('Unit Carpet Efficiency (weighted)', a.uldEff, b.uldEff, { unit: '%', better: 'higher', dp: 1 }),
    row('Floor to Floor Height (Apt)', a.kr.floorToFloorHeightApt, b.kr.floorToFloorHeightApt, { unit: 'm' }),
  ])

  const reqA = parkingRequired(a.other.extraParkingReqs, a.pd.tableRows).total || null
  const reqB = parkingRequired(b.other.extraParkingReqs, b.pd.tableRows).total || null
  add('parking', 'Parking & Basements', [
    row('Car Parks Provided', a.cars, b.cars),
    row('Car Parks Required', reqA, reqB, { unit: 'ECS' }),
    row('Parking Surplus / (Deficit)', a.cars !== null && reqA ? a.cars - reqA : null, b.cars !== null && reqB ? b.cars - reqB : null, { better: 'higher' }),
    row('Car Parks per Unit', a.cars && a.units ? a.cars / a.units : null, b.cars && b.units ? b.cars / b.units : null, { better: 'higher' }),
    row('Parking Efficiency', ratioNum(a.ratios.parkingEfficiency), ratioNum(b.ratios.parkingEfficiency), { unit: 'sq ft/car', better: 'lower' }),
    row('No. of Basements', a.kr.noOfBasements, b.kr.noOfBasements),
    row('Driveway Width (Basement)', a.kr.drivewayWidthBasement, b.kr.drivewayWidthBasement, { unit: 'm' }),
  ])

  const revA = a.saleable && a.price ? a.saleable * a.price : null
  const revB = b.saleable && b.price ? b.saleable * b.price : null
  const costA = a.bua && a.cost ? a.bua * a.cost : null
  const costB = b.bua && b.cost ? b.bua * b.cost : null
  add('commercials', 'Commercials', [
    row('Sales Price', a.price, b.price, { unit: 'Rs./sq ft' }),
    row('Construction Cost on BUA', a.cost, b.cost, { unit: 'Rs./sq ft', better: 'lower' }),
    row('Gross Sales Value', revA ? revA / 1e7 : null, revB ? revB / 1e7 : null, { unit: 'Rs. Cr' }),
    row('Construction Cost', costA ? costA / 1e7 : null, costB ? costB / 1e7 : null, { unit: 'Rs. Cr', better: 'lower' }),
    row('Construction Cost / Sales Value', revA && costA ? (costA / revA) * 100 : null, revB && costB ? (costB / revB) * 100 : null, { unit: '%', better: 'lower', dp: 1 }),
  ])

  add('structure', 'Structure', [
    row('Structural System', a.st.structuralSystem, b.st.structuralSystem, { text: true }),
    row('Type of Construction', a.st.typeOfConstruction, b.st.typeOfConstruction, { text: true }),
    row('Max. Grade of Concrete', a.st.maxGradeOfConcrete, b.st.maxGradeOfConcrete, { text: true }),
    row('Steel Consumption Coefficient', a.st.steelConsumptionCoefficient, b.st.steelConsumptionCoefficient, { unit: 'Kg/sqft', better: 'lower' }),
    row('Concrete Consumption Coefficient', a.st.concreteConsumptionCoefficient, b.st.concreteConsumptionCoefficient, { unit: 'cum/sqft', better: 'lower', dp: 3 }),
    row('Total Steel Consumption', a.st.totalSteelConsumption, b.st.totalSteelConsumption, { unit: 'Kg', dp: 0 }),
    row('Total Concrete Consumption', a.st.totalConcreteConsumption, b.st.totalConcreteConsumption, { unit: 'cu. m', dp: 0 }),
  ])

  add('mep', 'MEP', [
    row('Passenger Lifts per Tower', a.mp.passengerLiftsNo, b.mp.passengerLiftsNo, { better: 'higher' }),
    row('Passenger Lift Speed', a.mp.passengerLiftsSpeed, b.mp.passengerLiftsSpeed, { unit: 'm/sec' }),
    row('Avg. Waiting Time (Passenger)', a.mp.passengerAverageWait, b.mp.passengerAverageWait, { unit: 'sec', better: 'lower' }),
    row('Service Lifts', a.mp.serviceLiftsNo, b.mp.serviceLiftsNo),
    row('AC Provision in Units', a.mp.acProvisionUnits, b.mp.acProvisionUnits, { text: true }),
    row('Tonnage per Apartment', a.mp.tonnageApartment, b.mp.tonnageApartment),
    row('Cooling Efficiency (Apartment)', a.mp.efficiencyApartment, b.mp.efficiencyApartment, { unit: 'sq ft/TR' }),
  ])

  add('amenities', 'Landscape, Amenities & Services', [
    row('Total Landscape Area', a.ld.totalLandscapeArea, b.ld.totalLandscapeArea, { unit: 'sq m', better: 'higher' }),
    row('Amenities Provided', a.amenities || null, b.amenities || null, { better: 'higher' }),
    row('Landscape Zoning', a.ld.landscapeZoning, b.ld.landscapeZoning, { text: true }),
    row('Green Belt Width', a.ld.greenBeltWidth, b.ld.greenBeltWidth, { unit: 'm' }),
    row('Service Design within Benchmark', a.sdFilled ? (a.sdOk / a.sdFilled) * 100 : null, b.sdFilled ? (b.sdOk / b.sdFilled) * 100 : null, { unit: '%', better: 'higher', dp: 0 }),
    row('STP Technology', obj(obj(A.summary).serviceDesignData).stpTechnology, obj(obj(B.summary).serviceDesignData).stpTechnology, { text: true }),
    row('EV Charging Provision', obj(obj(A.summary).serviceDesignData).evCharging, obj(obj(B.summary).serviceDesignData).evCharging, { text: true }),
  ])

  add('governance', 'Delivery & Governance', [
    row('Consultants Appointed', a.cons ? (a.appointed / a.cons) * 100 : null, b.cons ? (b.appointed / b.cons) * 100 : null, { unit: '%', better: 'higher', dp: 0 }),
    row('Approvals Received', a.apprTotal ? (a.received / a.apprTotal) * 100 : null, b.apprTotal ? (b.received / b.apprTotal) * 100 : null, { unit: '%', better: 'higher', dp: 0 }),
    row('RERA', a.rera ? (str(a.rera.actualApproval) ? 'Approved' : 'Pending') : '', b.rera ? (str(b.rera.actualApproval) ? 'Approved' : 'Pending') : '', { text: true }),
    row('Construction Start', fmtDate(a.start), fmtDate(b.start), { text: true }),
    row('Construction Finish', fmtDate(a.end), fmtDate(b.end), { text: true }),
    row('Construction Duration', a.months || null, b.months || null, { unit: 'months', better: 'lower', dp: 1 }),
    row('Contract Packages', a.packages || null, b.packages || null),
    row('Phases', a.phases || null, b.phases || null),
  ])

  const kpis: CompareKpi[] = [
    kpi('Total Units', a.totalUnits || null, b.totalUnits || null),
    kpi('Saleable Area', a.saleable, b.saleable, 'sq ft'),
    kpi('Site Area', num(a.p.site_area_acres ?? a.pd.totalArea), num(b.p.site_area_acres ?? b.pd.totalArea), 'Acres'),
    kpi('Towers', num(a.pd.noOfTowers), num(b.pd.noOfTowers)),
    kpi('Building Height', num(a.kr.buildingHeight ?? a.pd.towerHeight), num(b.kr.buildingHeight ?? b.pd.towerHeight), 'm'),
    kpi('Car Parks', a.cars, b.cars),
  ]

  const all = S.flatMap((s) => s.rows).filter((r) => r.winner)
  const score = {
    a: all.filter((r) => r.winner === 'a').length,
    b: all.filter((r) => r.winner === 'b').length,
    tie: all.filter((r) => r.winner === 'tie').length,
    measured: all.length,
  }
  return { a: head(a), b: head(b), kpis, sections: S, score }
}

function kpi(label: string, an: number | null, bn: number | null, unit?: string): CompareKpi {
  return { label, unit, an, bn, a: fmtNum(an, 2), b: fmtNum(bn, 2) }
}
function density(f: ReturnType<typeof facts>) {
  const ac = num(f.p.site_area_acres ?? f.pd.totalArea)
  return ac && f.resTotalUnits ? f.resTotalUnits / ac : null
}
function order(k: string) {
  if (k === 'Studio') return 0
  const m = /^(\d)/.exec(k)
  if (m) return Number(m[1])
  return k === 'Penthouse' ? 20 : 30
}

/** share of the larger of the two values (0..1) — bar lengths */
export function barShare(an: number | null, bn: number | null) {
  const max = Math.max(Math.abs(an ?? 0), Math.abs(bn ?? 0))
  return { a: max > 0 && an !== null ? Math.abs(an) / max : 0, b: max > 0 && bn !== null ? Math.abs(bn) / max : 0 }
}
