/*
 * Module 21 "Comparison": management comparison of two projects.
 * Pure logic shared by the Comparison page and the PDF export (backend imports it through the @/ alias),
 * so the screen and the PDF always show the same rows, values and winners.
 */
import { comparisonRatios } from '@/components/design-chapters/project-level/calc'
import { SERVICE_DESIGN } from '@/components/design-chapters-b/serviceCatalogue'
import { parkingRequired } from '@/lib/parkingRequired'
import { facadeContextOf, facadeOutputs, facadeText, type FacadeData } from '@/lib/facade'
import { servicesContextOf, servicesOutputs } from '@/lib/services'
import { amenityOutputsOf } from '@/lib/amenities'
import { consultantFees, contractBudgets } from '@/lib/fees'
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

export type CompareHead = { id: string; name: string; location: string; category: string; projectType: string; portfolio: string; classification: string }

export type CompareRow = {
  label: string
  unit?: string
  better?: Better
  /** display text per project (same order as the projects) */
  values: string[]
  /** numbers per project (null = not a number / not entered) */
  nums: (number | null)[]
  /** indices of the best project(s) for rows with a direction; empty when equal or not comparable */
  best: number[]
  /** all compared projects have the same value (rows with a direction) */
  tie: boolean
  /** two projects: (second - first) / |first| in % */
  deltaPct: number | null
}

export type CompareSection = { key: string; title: string; rows: CompareRow[] }
export type CompareKpi = { label: string; unit?: string; nums: (number | null)[]; values: string[] }

export type Comparison = {
  heads: CompareHead[]
  kpis: CompareKpi[]
  sections: CompareSection[]
  /** rows won per project, rows where all are equal, rows with a direction and at least two numbers */
  score: { wins: number[]; tie: number; measured: number }
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

type RowOpts = { unit?: string; better?: Better; dp?: number; text?: boolean }

function row(label: string, raw: unknown[], opts: RowOpts & { sane?: (v: number) => boolean } = {}): CompareRow | null {
  const nums = raw.map((v) => (opts.text ? null : num(v)))
  const values = raw.map((v, i) => (opts.text || nums[i] === null ? yesNo(v) : fmtNum(nums[i], opts.dp)) || '-')
  if (values.every((v) => v === '-')) return null
  const present = nums.map((n, i) => ({ n, i })).filter((x): x is { n: number; i: number } => x.n !== null && (!opts.sane || opts.sane(x.n)))
  let best: number[] = []
  let tie = false
  if (opts.better && present.length >= 2) {
    const target = opts.better === 'higher' ? Math.max(...present.map((x) => x.n)) : Math.min(...present.map((x) => x.n))
    best = present.filter((x) => x.n === target).map((x) => x.i)
    if (best.length === present.length) {
      tie = true
      best = []
    }
  }
  const deltaPct = nums.length === 2 && nums[0] !== null && nums[1] !== null && nums[0] !== 0 ? ((nums[1] - nums[0]) / Math.abs(nums[0])) * 100 : null
  return { label, unit: opts.unit, better: opts.better, values, nums, best, tie, deltaPct }
}

/* ------------------------------------------------------------------ per-project facts */
type UnitRow = { type?: unknown; count?: unknown; size?: unknown; area?: unknown }
type Group = { type?: unknown; units?: unknown }

export function projectFacts(x: CompareInput) {
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
      if (v === undefined || v === '' || prm.benchmark === undefined) continue
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


/* ------------------------------------------------------------------ row definitions (one list for screen, PDF and portfolio stats) */
type Facts = ReturnType<typeof projectFacts>
/** sane: values outside it are data errors (flagged elsewhere) and stay out of the portfolio averages */
type Def = { section: string; title: string; label: string; get: (f: Facts, x: CompareInput) => unknown; sane?: (v: number) => boolean } & RowOpts

const sd = (x: CompareInput) => obj(obj(x.summary).serviceDesignData)
const fd = (x: CompareInput) => obj(x.summary).facadeData as FacadeData | undefined
const fo = (x: CompareInput) => facadeOutputs(fd(x), facadeContextOf(x.summary, x.mep))
const so = (x: CompareInput) => servicesOutputs(sd(x), servicesContextOf(x.summary))
const ao = (x: CompareInput) => amenityOutputsOf(x.summary)
const cf = (x: CompareInput) => consultantFees(x.summary)
const cb = (x: CompareInput) => contractBudgets(x.summary)
const req = (f: Facts) => parkingRequired(f.other.extraParkingReqs, f.pd.tableRows).total || null
const gsvOf = (f: Facts) => (f.saleable && f.price ? f.saleable * f.price : null)
const costOf = (f: Facts) => (f.bua && f.cost ? f.bua * f.cost : null)
const farUtilOf = (f: Facts) => (f.far && f.pfar && f.far / f.pfar < 2 ? (f.far / f.pfar) * 100 : null)

const SECTIONS: [string, string][] = [
  ['overview', 'Project Overview'],
  ['mix', 'Unit Mix (Residential)'],
  ['area', 'Area & FAR'],
  ['efficiency', 'Design Efficiency'],
  ['parking', 'Parking & Basements'],
  ['commercials', 'Commercials'],
  ['consultants', 'Consultant Charges (Rs. per sq ft BUA)'],
  ['contracts', 'Contract Package Budgets'],
  ['structure', 'Structure'],
  ['mep', 'MEP'],
  ['facade', 'Façade & Envelope'],
  ['services', 'Services Sizing'],
  ['club', 'Club & Amenities'],
  ['amenities', 'Landscape, Amenities & Services'],
  ['governance', 'Delivery & Governance'],
]
const T = Object.fromEntries(SECTIONS)
const d = (section: string, label: string, get: Def['get'], opts: RowOpts & { sane?: Def['sane'] } = {}): Def => ({ section, title: T[section], label, get, ...opts })

const FIXED_DEFS: Def[] = [
  d('overview', 'Location', (f) => f.p.location, { text: true }),
  d('overview', 'Portfolio', (f) => f.p.locationCategory, { text: true }),
  d('overview', 'Category', (f) => f.p.category, { text: true }),
  d('overview', 'Classification', (f) => f.p.projectClassification, { text: true }),
  d('overview', 'Site Area', (f) => f.p.site_area_acres ?? f.pd.totalArea, { unit: 'Acres', sane: (v) => v > 0 && v <= 200 }),
  d('overview', 'No. of Towers', (f) => f.pd.noOfTowers),
  d('overview', 'Building Height', (f) => f.kr.buildingHeight ?? f.pd.towerHeight, { unit: 'm', sane: (v) => v > 0 && v <= 600 }),
  d('overview', 'Total Units (all types)', (f) => f.totalUnits || null),
  d('overview', 'Residential Units', (f) => f.resTotalUnits || null),
  d('overview', 'Residential Saleable Area', (f) => f.resTotalArea || null, { unit: 'sq ft' }),
  d('overview', 'Avg. Unit Size (Residential)', (f) => (f.resTotalUnits ? f.resTotalArea / f.resTotalUnits : null), { unit: 'sq ft', dp: 0 }),
  d('overview', 'Units per Acre', (f) => density(f), { unit: 'units/acre', dp: 1 }),
  d('overview', 'Saleable per Acre', (f) => {
    const ac = num(f.p.site_area_acres ?? f.pd.totalArea)
    return ac && f.saleable && ac < 500 ? f.saleable / ac : null
  }, { unit: 'sq ft/acre', dp: 0 }),

  d('area', 'Saleable Area', (f) => f.saleable, { unit: 'sq ft' }),
  d('area', 'Carpet Area', (f) => f.kr.carpetArea, { unit: 'sq ft' }),
  d('area', 'Built Up Area', (f) => f.bua, { unit: 'sq ft' }),
  d('area', 'FAR Achieved', (f) => f.far, { unit: 'sq ft' }),
  d('area', 'Permissible FAR', (f) => f.pfar, { unit: 'sq ft', dp: 0 }),
  d('area', 'FAR Utilisation', (f) => farUtilOf(f), { unit: '%', better: 'higher' }),
  d('area', 'Balcony Area', (f) => f.kr.balconyArea, { unit: 'sq ft' }),
  d('area', 'Balcony Area / FAR', (f) => (f.far ? pctOf(num(f.kr.balconyArea) ?? 0, f.far) : null), { unit: '%' }),
  d('area', 'Total Basement Area', (f) => f.kr.totalBasementArea, { unit: 'sq ft' }),

  d('efficiency', 'Carpet / Saleable', (f) => ratioNum(f.ratios.carpetSaleable), { unit: '%', better: 'higher' , sane: (v) => v > 0 }),
  d('efficiency', 'Saleable / FAR', (f) => (f.saleable && f.far ? f.saleable / f.far : null), { better: 'higher' , sane: (v) => v > 0 }),
  d('efficiency', 'BUA / Saleable', (f) => (f.bua && f.saleable ? f.bua / f.saleable : null), { better: 'lower' , sane: (v) => v > 0 }),
  d('efficiency', 'BUA / FAR', (f) => (f.bua && f.far ? f.bua / f.far : null), { better: 'lower' , sane: (v) => v > 0 }),
  d('efficiency', 'Core Efficiency (Shaft / FAR)', (f) => ratioNum(f.ratios.coreEfficiency), { unit: '%', better: 'lower' , sane: (v) => v > 0 }),
  d('efficiency', 'Loading Factor', (f) => ratioNum(f.ratios.loadingFactor), { sane: (v) => v > 0 }),
  d('efficiency', 'Unit Carpet Efficiency (weighted)', (f) => f.uldEff, { unit: '%', better: 'higher', dp: 1 , sane: (v) => v > 0 }),
  d('efficiency', 'Floor to Floor Height (Apt)', (f) => {
    const h = num(f.kr.floorToFloorHeightApt)
    return h !== null && h > 20 ? null : f.kr.floorToFloorHeightApt // millimetre entries are flagged as data errors
  }, { unit: 'm' }),

  d('parking', 'Car Parks Provided', (f) => f.cars),
  d('parking', 'Car Parks Required', (f) => req(f), { unit: 'ECS' }),
  d('parking', 'Parking Surplus / (Deficit)', (f) => (f.cars !== null && req(f) ? f.cars - req(f)! : null), { better: 'higher' }),
  d('parking', 'Car Parks per Unit', (f) => (f.cars && f.units ? f.cars / f.units : null), { better: 'higher' , sane: (v) => v > 0 }),
  d('parking', 'Parking Efficiency', (f) => ratioNum(f.ratios.parkingEfficiency), { unit: 'sq ft/car', better: 'lower' , sane: (v) => v > 0 }),
  d('parking', 'No. of Basements', (f) => f.kr.noOfBasements),
  d('parking', 'Driveway Width (Basement)', (f) => f.kr.drivewayWidthBasement, { unit: 'm' }),

  d('commercials', 'Sales Price', (f) => f.price, { unit: 'Rs./sq ft' }),
  d('commercials', 'Construction Cost on BUA', (f) => f.cost, { unit: 'Rs./sq ft', better: 'lower' }),
  d('commercials', 'Construction Cost per sq ft Saleable', (f) => (costOf(f) && f.saleable ? costOf(f)! / f.saleable : null), { unit: 'Rs./sq ft', better: 'lower', dp: 0 }),
  d('commercials', 'Gross Sales Value', (f) => (gsvOf(f) ? gsvOf(f)! / 1e7 : null), { unit: 'Rs. Cr' }),
  d('commercials', 'Construction Cost', (f) => (costOf(f) ? costOf(f)! / 1e7 : null), { unit: 'Rs. Cr' }),
  d('commercials', 'Construction Cost / Sales Value', (f) => (gsvOf(f) && costOf(f) ? (costOf(f)! / gsvOf(f)!) * 100 : null), { unit: '%', better: 'lower', dp: 1 , sane: (v) => v > 0 }),

  d('structure', 'Structural System', (f) => f.st.structuralSystem, { text: true }),
  d('structure', 'Type of Construction', (f) => f.st.typeOfConstruction, { text: true }),
  d('structure', 'Max. Grade of Concrete', (f) => f.st.maxGradeOfConcrete, { text: true }),
  d('structure', 'Steel Consumption Coefficient', (f) => f.st.steelConsumptionCoefficient, { unit: 'Kg/sqft', better: 'lower' }),
  d('structure', 'Concrete Consumption Coefficient', (f) => f.st.concreteConsumptionCoefficient, { unit: 'cum/sqft', better: 'lower', dp: 3 }),
  d('structure', 'Total Steel Consumption', (f) => f.st.totalSteelConsumption, { unit: 'Kg', dp: 0 }),
  d('structure', 'Total Concrete Consumption', (f) => f.st.totalConcreteConsumption, { unit: 'cu. m', dp: 0 }),

  d('mep', 'Passenger Lifts per Tower', (f) => f.mp.passengerLiftsNo, { better: 'higher' }),
  d('mep', 'Passenger Lift Speed', (f) => f.mp.passengerLiftsSpeed, { unit: 'm/sec' }),
  d('mep', 'Avg. Waiting Time (Passenger)', (f) => f.mp.passengerAverageWait, { unit: 'sec', better: 'lower' }),
  d('mep', 'Service Lifts', (f) => f.mp.serviceLiftsNo),
  d('mep', 'AC Provision in Units', (f) => f.mp.acProvisionUnits, { text: true }),
  d('mep', 'Tonnage per Apartment', (f) => f.mp.tonnageApartment),
  d('mep', 'Cooling Efficiency (Apartment)', (f) => f.mp.efficiencyApartment, { unit: 'sq ft/TR' }),

  // Façade & Envelope (module 14 / commercial 10)
  d('facade', 'Façade System', (_f, x) => facadeText(fd(x), 'facadeSystem'), { text: true }),
  d('facade', 'Glass Type', (_f, x) => facadeText(fd(x), 'glassType'), { text: true }),
  d('facade', 'SHGC', (_f, x) => fd(x)?.shgc, { better: 'lower', dp: 2, sane: (v) => v >= 0 && v <= 1 }),
  d('facade', 'U-Value', (_f, x) => fd(x)?.uValue, { unit: 'W/m²K', better: 'lower', dp: 2 }),
  d('facade', 'Glazing %', (_f, x) => fo(x).glazingPct, { unit: '%', dp: 1 }),
  d('facade', 'Façade Cost per sq ft (façade)', (_f, x) => fd(x)?.facadeCostPerSqft, { unit: 'Rs./sq ft', dp: 0 }),
  d('facade', 'Façade Cost per sq ft Saleable', (_f, x) => fo(x).costPerSaleable, { unit: 'Rs./sq ft', better: 'lower', dp: 0 }),
  d('facade', 'Heat-Gain Index', (_f, x) => fo(x).heatGainIndex, { unit: 'per 1,000 sq ft saleable', better: 'lower', dp: 1 }),
  d('facade', 'Glass Load per TR', (_f, x) => fo(x).glassPerTR, { unit: 'sq ft/TR', better: 'lower', dp: 1 }),
  d('facade', 'Shading Devices', (_f, x) => facadeText(fd(x), 'shadingDevices'), { text: true }),
  d('facade', 'Façade Cleaning', (_f, x) => facadeText(fd(x), 'cleaningMethod'), { text: true }),

  // Services sizing (module 13)
  d('services', 'Connected Load per Unit', (_f, x) => so(x).kvaPerUnit, { unit: 'kVA', dp: 2 }),
  d('services', 'Transformer Loading', (_f, x) => so(x).transformerLoading, { unit: '%', dp: 0 }),
  d('services', 'DG Backup — Units', (_f, x) => so(x).dgUnits, { unit: '%', better: 'higher', dp: 0 }),
  d('services', 'DG Backup — Common Areas', (_f, x) => so(x).dgCommon, { unit: '%', better: 'higher', dp: 0 }),
  d('services', 'Water Demand', (_f, x) => sd(x).waterDemandLpcd, { unit: 'LPCD', dp: 0 }),
  d('services', 'Water Storage', (_f, x) => so(x).storageDays, { unit: 'days', dp: 1 }),
  d('services', 'Water Recycled', (_f, x) => so(x).recycledPct, { unit: '%', better: 'higher', dp: 0 }),
  d('services', 'Solar PV', (_f, x) => sd(x).solarPvKwp, { unit: 'kWp', dp: 0 }),
  d('services', 'Solar Share of Load', (_f, x) => so(x).solarSharePct, { unit: '%', better: 'higher', dp: 1 }),
  d('services', 'EV Charging Points', (_f, x) => so(x).evPoints, { unit: 'nos', better: 'higher', dp: 0 }),
  d('services', 'EV Charging (% of car parks)', (_f, x) => so(x).evPct, { unit: '%', better: 'higher', dp: 0 }),
  d('services', 'Hot Water Source', (_f, x) => sd(x).hotWaterSource, { text: true }),
  d('services', 'Sprinklers', (_f, x) => sd(x).sprinklers, { text: true }),
  d('services', 'Smart Home Level', (_f, x) => sd(x).smartHomeLevel, { text: true }),

  // Club & Amenities (module 6)
  d('club', 'Clubhouse Area', (_f, x) => ao(x).clubArea, { unit: 'sq ft', dp: 0 }),
  d('club', 'Club Area / Unit', (_f, x) => ao(x).clubPerUnit, { unit: 'sq ft/unit', better: 'higher', dp: 1 }),
  d('club', 'Pool Area / Unit', (_f, x) => ao(x).poolPerUnit, { unit: 'sq ft/unit', better: 'higher', dp: 2 }),
  d('club', 'Amenities per 100 Units', (_f, x) => ao(x).amenitiesPer100, { better: 'higher', dp: 1 }),
  d('club', 'Sports Courts', (_f, x) => ao(x).courts, { better: 'higher', dp: 0 }),
  d('club', 'Entrance Lobby', (_f, x) => ao(x).lobby, { text: true }),

  // Contract package budgets (module 15 Contracting Strategy)
  d('contracts', 'Total Package Budget', (_f, x) => (cb(x).total !== null ? cb(x).total! / 1e7 : null), { unit: 'Rs. Cr', dp: 2 }),
  d('contracts', 'Package Budget per sq ft BUA', (_f, x) => cb(x).perSqft, { unit: 'Rs./sq ft', better: 'lower', dp: 0 }),

  d('amenities', 'Total Landscape Area', (f) => f.ld.totalLandscapeArea, { unit: 'sq m', better: 'higher' }),
  d('amenities', 'Amenities Provided', (f) => f.amenities || null, { better: 'higher' }),
  d('amenities', 'Landscape Zoning', (f) => f.ld.landscapeZoning, { text: true }),
  d('amenities', 'Green Belt Width', (f) => f.ld.greenBeltWidth, { unit: 'm' }),
  d('amenities', 'Service Design within Benchmark', (f) => (f.sdFilled ? (f.sdOk / f.sdFilled) * 100 : null), { unit: '%', better: 'higher', dp: 0 }),
  d('amenities', 'STP Technology', (_f, x) => sd(x).stpTechnology, { text: true }),
  d('amenities', 'EV Charging Provision', (_f, x) => sd(x).evCharging, { text: true }),

  d('governance', 'Consultants Appointed', (f) => (f.cons ? (f.appointed / f.cons) * 100 : null), { unit: '%', better: 'higher', dp: 0 }),
  d('governance', 'Approvals Received', (f) => (f.apprTotal ? (f.received / f.apprTotal) * 100 : null), { unit: '%', better: 'higher', dp: 0 }),
  d('governance', 'RERA', (f) => (f.rera ? (str(f.rera.actualApproval) ? 'Approved' : 'Pending') : ''), { text: true }),
  d('governance', 'Construction Start', (f) => fmtDate(f.start), { text: true }),
  d('governance', 'Construction Finish', (f) => fmtDate(f.end), { text: true }),
  d('governance', 'Construction Duration', (f) => f.months || null, { unit: 'months', better: 'lower', dp: 1 }),
  d('governance', 'Contract Packages', (f) => f.packages || null),
  d('governance', 'Phases', (f) => f.phases || null),
]

/** Rs. per sq ft BUA for each consultant type any of the projects has a fee for, then the total */
function consultantDefs(inputs: CompareInput[]): Def[] {
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')
  const types: string[] = []
  for (const x of inputs)
    for (const l of consultantFees(x.summary).lines) if (l.fee !== null && l.type && !types.some((t) => key(t) === key(l.type))) types.push(l.type)
  if (!types.length) return []
  const perType = (x: CompareInput, t: string) => {
    const ls = consultantFees(x.summary).lines.filter((l) => key(l.type) === key(t) && l.perSqft !== null)
    return ls.length ? ls.reduce((a, l) => a + l.perSqft!, 0) : null
  }
  return [
    ...types.map((t) => d('consultants', t, (_f, x) => perType(x, t), { unit: 'Rs./sq ft', better: 'lower', dp: 2 })),
    d('consultants', 'Total Consultant Fees', (_f, x) => cf(x).perSqft, { unit: 'Rs./sq ft', better: 'lower', dp: 2 }),
    d('consultants', 'Total Consultant Fees (amount)', (_f, x) => (cf(x).total !== null ? cf(x).total! / 1e7 : null), { unit: 'Rs. Cr', dp: 2 }),
  ]
}

/** unit-mix rows for the bedroom types any of the projects has */
function mixDefs(facts: Facts[]): Def[] {
  const keys = [...new Set(facts.flatMap((f) => [...f.mix.keys()]))].sort((x, y) => order(x) - order(y))
  return keys.flatMap((k) => [
    d('mix', `${k} — Units`, (f) => f.mix.get(k)?.units ?? null),
    d('mix', `${k} — Share of Units`, (f) => (f.mix.get(k) && f.resTotalUnits ? (f.mix.get(k)!.units / f.resTotalUnits) * 100 : null), { unit: '%', dp: 1 }),
    d('mix', `${k} — Avg. Size`, (f) => (f.mix.get(k)?.units ? f.mix.get(k)!.area / f.mix.get(k)!.units : null), { unit: 'sq ft', dp: 0 }),
  ])
}
function defsFor(facts: Facts[], inputs: CompareInput[] = []) {
  const mix = mixDefs(facts)
  // keep the section order: overview, unit mix, then the rest (sections are sorted by SECTIONS afterwards)
  return [...FIXED_DEFS.filter((x) => x.section === 'overview'), ...mix, ...FIXED_DEFS.filter((x) => x.section !== 'overview'), ...consultantDefs(inputs)]
}

/* ------------------------------------------------------------------ comparison of 2-5 projects */
export function buildComparison(...inputs: CompareInput[]): Comparison {
  const facts = inputs.map(projectFacts)
  const heads = facts.map((f) => ({
    id: str(f.p.id),
    name: str(f.p.name),
    location: str(f.p.location),
    category: str(f.p.category),
    projectType: str(f.p.projectType),
    portfolio: str(f.p.locationCategory),
    classification: str(f.p.projectClassification),
  }))
  const sections: CompareSection[] = []
  for (const def of defsFor(facts, inputs)) {
    const r = row(def.label, facts.map((f, i) => def.get(f, inputs[i])), def)
    if (!r) continue
    let sec = sections.find((x) => x.key === def.section)
    if (!sec) sections.push((sec = { key: def.section, title: def.title, rows: [] }))
    sec.rows.push(r)
  }
  sections.sort((a, b) => SECTIONS.findIndex((x) => x[0] === a.key) - SECTIONS.findIndex((x) => x[0] === b.key))

  const kpi = (label: string, get: (f: Facts) => number | null, unit?: string): CompareKpi => {
    const nums = facts.map(get)
    return { label, unit, nums, values: nums.map((n) => fmtNum(n, 2)) }
  }
  const kpis: CompareKpi[] = [
    kpi('Total Units', (f) => f.totalUnits || null),
    kpi('Saleable Area', (f) => f.saleable, 'sq ft'),
    kpi('Site Area', (f) => num(f.p.site_area_acres ?? f.pd.totalArea), 'Acres'),
    kpi('Towers', (f) => num(f.pd.noOfTowers)),
    kpi('Building Height', (f) => num(f.kr.buildingHeight ?? f.pd.towerHeight), 'm'),
    kpi('Car Parks', (f) => f.cars),
  ]

  const scored = sections.flatMap((s) => s.rows).filter((r) => r.best.length || r.tie)
  const score = {
    wins: inputs.map((_, i) => scored.filter((r) => r.best.includes(i)).length),
    tie: scored.filter((r) => r.tie).length,
    measured: scored.length,
  }
  return { heads, kpis, sections, score }
}

/** portfolio reference per row (average, best and lowest project) over many projects — "portfolio avg 49.1%; best 55.2% (Sanctuary)" */
export type RowStat = { avg: number; best: { name: string; v: number }; low: { name: string; v: number }; n: number; unit?: string; better?: Better }
export function portfolioRowStats(inputs: CompareInput[]): Record<string, RowStat> {
  const facts = inputs.map(projectFacts)
  const out: Record<string, RowStat> = {}
  for (const def of defsFor(facts, inputs)) {
    if (def.text) continue
    const vals = facts
      .map((f, i) => ({ name: str(f.p.name), v: num(def.get(f, inputs[i])) }))
      .filter((x): x is { name: string; v: number } => x.v !== null && Number.isFinite(x.v) && (!def.sane || def.sane(x.v)))
    if (vals.length < 2) continue
    const sorted = [...vals].sort((a, b) => (def.better === 'lower' ? a.v - b.v : b.v - a.v))
    out[def.label] = { avg: vals.reduce((s, x) => s + x.v, 0) / vals.length, best: sorted[0], low: sorted[sorted.length - 1], n: vals.length, unit: def.unit, better: def.better }
  }
  return out
}

function density(f: Facts) {
  const ac = num(f.p.site_area_acres ?? f.pd.totalArea)
  return ac && f.resTotalUnits && ac < 500 ? f.resTotalUnits / ac : null
}
function order(k: string) {
  if (k === 'Studio') return 0
  const m = /^(\d)/.exec(k)
  if (m) return Number(m[1])
  return k === 'Penthouse' ? 20 : 30
}

/** each value's share of the largest one (0..1) — bar lengths */
export function barShares(nums: (number | null)[]) {
  const max = Math.max(0, ...nums.map((n) => Math.abs(n ?? 0)))
  return nums.map((n) => (max > 0 && n !== null ? Math.abs(n) / max : 0))
}
/** two-value form kept for callers comparing a pair */
export function barShare(an: number | null, bn: number | null) {
  const [a, b] = barShares([an, bn])
  return { a, b }
}
