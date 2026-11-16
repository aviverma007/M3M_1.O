/*
 * Project Design Efficiencies — the management sheet ("2026.11.16 PROJECT DESIGN EFFICIENCIES"), one row per heading.
 *
 * Every row says where its figure comes from (module + field), how it is calculated and whether the app captures it:
 *   captured  the inputs exist in a module and the figure is calculated from them
 *   partial   calculated from what exists, but the sheet's definition needs an input the app doesn't have yet
 *   missing   no input anywhere in the app yet (shown as "Not captured" with where it should be entered)
 *
 * Shared by the backend (GET /portfolio/efficiency) and the dashboard (formula / source text).
 */

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const arr = <T = Obj>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())
export const effNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}
const pos = (v: unknown) => {
  const x = effNum(v)
  return x !== null && x > 0 ? x : null
}
/** heights entered in millimetres (3450) -> metres */
const metres = (v: unknown) => {
  const x = pos(v)
  return x === null ? null : x > 20 ? x / 1000 : x
}

/**
 * Landscape Filling Margin (Module 6 › Non-Apt Configuration): the entered value, else
 * Floor to Floor Height (B1–GF) Tower Area − Floor to Floor Height (B1–GF) Non Tower Area.
 */
export function fillingMargin(kr: Record<string, unknown> | null | undefined): { value: number | null; auto: number | null; overridden: boolean } {
  const k = kr ?? {}
  const t = metres(k.floorToFloorHeightB1GFTower)
  const nt = metres(k.floorToFloorHeightB1GFNonTower)
  const auto = t !== null && nt !== null ? Math.round((t - nt) * 1000) / 1000 : null
  const entered = effNum(k.landscapeFillingMargin)
  return { value: entered ?? auto, auto, overridden: entered !== null }
}

export type EffInput = {
  project: Obj
  summary: Obj | null
  structure?: Obj | null
  mep?: Obj | null
  /** Module 1 Key Ratio record fields (snake_case), if the project has one */
  m1?: Obj | null
}
export type EffStatus = 'captured' | 'partial' | 'missing'
export type EffValue = number | string | null
export type EffGroup = { id: string; title: string; tone: string }
export type EffRowMeta = {
  id: string
  group: string
  label: string
  unit?: string
  dp?: number
  /** which way is better (colours the cells); none = no ranking */
  better?: 'lower' | 'higher'
  status: EffStatus
  /** module name (as in components/portfolio/links) + number shown to users */
  module: string
  moduleNo: string
  /** field to highlight when the cell opens the module */
  focus?: string
  formula: string
  note?: string
  /** plausible range; values outside it are shown as "check entry" and left out of averages / ranking */
  sane?: [number, number]
}
type EffRow = EffRowMeta & { get?: (c: Ctx) => EffValue }

export const EFF_GROUPS: EffGroup[] = [
  { id: 'overall', title: 'Overall Project Efficiency', tone: '#facc15' },
  { id: 'subBua', title: 'BUA Efficiency — Substructure', tone: '#fb923c' },
  { id: 'supBua', title: 'BUA Efficiency — Superstructure', tone: '#f97316' },
  { id: 'supFar', title: 'FAR Efficiency — Superstructure', tone: '#38bdf8' },
  { id: 'typFar', title: 'FAR Efficiency — Typical Floor', tone: '#0ea5e9' },
  { id: 'cost', title: 'Other Cost Related Efficiency', tone: '#22c55e' },
]

/* ------------------------------------------------------------------ the facts a project gives */
function context(x: EffInput) {
  const p = x.project
  const s = obj(x.summary)
  const pd = obj(s.projectDetailsLayoutData)
  const pl = obj(s.projectLevelDesignData)
  const kr = obj(pl.keyRatioInputs)
  const rec = (r: Obj | null | undefined) => {
    const o = obj(r)
    return { ...obj(o.fields), ...obj(o.customFields), ...o } as Obj
  }
  const st = rec(x.structure)
  const mp = rec(x.mep)
  const m1 = obj(x.m1)
  const bua = pos(kr.builtUpArea) ?? pos(st.builtUpArea) ?? pos(m1.built_up_area)
  const far = pos(kr.far) ?? pos(m1.far)
  const saleable = pos(kr.saleableArea) ?? pos(m1.saleable_area)
  const basement = pos(kr.totalBasementArea) ?? pos(m1.total_basement_area)
  const balcony = pos(kr.balconyArea) ?? pos(m1.balcony_area)

  // Module 6 cluster level parameters, weighted by each cluster's floor FAR / BUA (teams often enter 100 = percentages)
  const clusters = arr(pl.clusterConfigs)
  const clusterPct = (part: string, base: 'floorFAR' | 'floorBUA' | 'wallPerimeterArea') => {
    let a = 0
    let b = 0
    for (const c of clusters) {
      const v = effNum(c[part])
      const d = pos(c[base])
      if (v === null || d === null) continue
      a += v
      b += d
    }
    return b > 0 ? (a / b) * 100 : null
  }

  // Module 7 unit level design: balcony counted in FAR as a share of unit FAR, weighted by no. of units
  const uld = arr(s.unitLevelDesignData)
  let balFar = 0
  let unitFar = 0
  for (const u of uld) {
    const n = pos(u.noOfUnits) ?? 1
    const b = effNum(u.balconyAreaFar)
    const f = pos(u.unitFar)
    if (b === null || f === null) continue
    balFar += b * n
    unitFar += f * n
  }

  const b1 = metres(kr.floorToFloorHeightB1GFNonTower) ?? metres(kr.floorToFloorHeightB1GFTower)
  const lower = [metres(kr.floorToFloorHeightB2B1), metres(kr.floorToFloorHeightB3B2)].filter((v): v is number => v !== null)
  const steelCoef =
    pos(st.steelConsumptionCoefficient) ?? (pos(m1.total_steel_reinforcement) && bua ? pos(m1.total_steel_reinforcement)! / bua : null)
  const lifts = pos(mp.passengerLiftsNo) ?? pos(m1.no_of_passanger_lift)
  const wait = pos(mp.passengerAverageWait) ?? pos(m1.avg_waiting_time)

  return { p, pd, kr, st, mp, m1, bua, far, saleable, basement, balcony, clusters, clusterPct, balFar, unitFar, b1, lower, steelCoef, lifts, wait }
}
type Ctx = ReturnType<typeof context>

const lacs = (v: number | null) => (v === null ? null : v / 1e5)
const div = (a: number | null, b: number | null) => (a !== null && b ? a / b : null)
const pct = (a: number | null, b: number | null) => (a !== null && b ? (a / b) * 100 : null)

const M5 = { module: 'Project Details', moduleNo: 'Module 5' }
const M6 = { module: 'Project Level Design', moduleNo: 'Module 6' }
const M7 = { module: 'Unit Level Design', moduleNo: 'Module 7' }
const M8 = { module: 'Structure', moduleNo: 'Module 8' }
const M9 = { module: 'MEP', moduleNo: 'Module 9' }

/* ------------------------------------------------------------------ the rows, in the order of the sheet */
const ROWS: EffRow[] = [
  // ---------------- Overall project efficiency
  {
    id: 'siteArea',
    sane: [0.1, 200],
    group: 'overall',
    label: 'Site Area',
    unit: 'acres',
    dp: 2,
    status: 'captured',
    ...M5,
    focus: 'Site Area',
    formula: 'Site Area (acres) from Project Details',
    get: (c) => pos(c.pd.totalArea) ?? pos(c.p.site_area_acres),
  },
  {
    id: 'far',
    group: 'overall',
    label: 'FAR',
    unit: 'lacs sq ft',
    dp: 2,
    status: 'captured',
    ...M6,
    focus: 'FAR',
    formula: 'Key Ratio › FAR ÷ 1,00,000',
    get: (c) => lacs(c.far),
  },
  {
    id: 'bua',
    group: 'overall',
    label: 'BUA',
    unit: 'lacs sq ft',
    dp: 2,
    status: 'captured',
    ...M6,
    focus: 'Built Up Area',
    formula: 'Key Ratio › Built Up Area ÷ 1,00,000',
    get: (c) => lacs(c.bua),
  },
  {
    id: 'height',
    sane: [3, 600],
    group: 'overall',
    label: 'Height',
    unit: 'm',
    dp: 2,
    status: 'captured',
    ...M6,
    focus: 'Building Height',
    formula: 'Key Ratio › Building Height (else Project Details › Building Height)',
    get: (c) => pos(c.kr.buildingHeight) ?? pos(c.pd.towerHeight),
  },
  {
    id: 'superFar',
    sane: [1, 2.5],
    group: 'overall',
    label: 'Super / FAR',
    dp: 2,
    better: 'higher',
    status: 'captured',
    ...M6,
    focus: 'Saleable Area',
    formula: 'Saleable (super) Area ÷ FAR',
    get: (c) => div(c.saleable, c.far),
  },
  {
    id: 'buaSuper',
    sane: [1, 2],
    group: 'overall',
    label: 'BUA / Super',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Built Up Area',
    formula: 'Built Up Area ÷ Saleable (super) Area',
    get: (c) => div(c.bua, c.saleable),
  },
  {
    id: 'buaFar',
    sane: [1, 3],
    group: 'overall',
    label: 'BUA / FAR',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Built Up Area',
    formula: 'Built Up Area ÷ FAR',
    get: (c) => div(c.bua, c.far),
  },
  {
    id: 'balconyFar',
    sane: [0, 60],
    group: 'overall',
    label: 'Balcony / FAR',
    unit: '%',
    dp: 1,
    status: 'captured',
    ...M6,
    focus: 'Balcony Area',
    formula: 'Balcony Area ÷ FAR × 100',
    get: (c) => pct(c.balcony, c.far),
  },
  {
    id: 'b1Height',
    sane: [2.5, 9],
    group: 'overall',
    label: 'Basement 1 Height',
    unit: 'm',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'B1',
    formula: 'Key Ratio › Floor to Floor Height B1 to GF (non-tower area; tower area if empty)',
    get: (c) => c.b1,
  },
  {
    id: 'lowerHeight',
    sane: [2.5, 9],
    group: 'overall',
    label: 'Lower Basements Height',
    unit: 'm',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'B2',
    formula: 'Key Ratio › Floor to Floor Height B2 to B1 (and B3 to B2), the higher one',
    get: (c) => (c.lower.length ? Math.max(...c.lower) : null),
  },
  {
    id: 'fillMargin',
    group: 'overall',
    label: 'Landscape Filling Margin',
    unit: 'm',
    dp: 2,
    sane: [0, 5],
    status: 'captured',
    ...M6,
    focus: 'Landscape Filling Margin',
    formula: 'Key Ratio › Landscape Filling Margin; by default Floor to Floor Height (B1–GF) Tower Area − Non Tower Area (editable)',
    get: (c) => fillingMargin(c.kr).value,
  },
  {
    id: 'steelPlanned',
    sane: [2, 20],
    group: 'overall',
    label: 'Planned Steel Consumption',
    unit: 'kg/sq ft',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M8,
    focus: 'Steel Consumption Coefficient',
    formula: 'Structures › Steel Consumption Coefficient (else Module 1 Total Steel ÷ BUA)',
    get: (c) => c.steelCoef,
  },
  {
    id: 'concreteGrade',
    group: 'overall',
    label: 'Max Grade of Concrete',
    status: 'captured',
    ...M8,
    focus: 'Max Grade of Concrete',
    formula: 'Structures › Max. Grade of Concrete',
    get: (c) => str(c.st.maxGradeOfConcrete) || null,
  },
  {
    id: 'lifts',
    sane: [1, 12],
    group: 'overall',
    label: 'Lifts per Tower',
    dp: 0,
    status: 'captured',
    ...M9,
    focus: 'Passenger Lifts',
    formula: 'MEP › Passenger Lifts (no.) per tower (else Module 1 Key Ratio)',
    get: (c) => c.lifts,
  },
  {
    id: 'wait',
    sane: [5, 180],
    group: 'overall',
    label: 'Average Waiting Time',
    unit: 'sec',
    dp: 0,
    better: 'lower',
    status: 'captured',
    ...M9,
    focus: 'Average Waiting Time',
    formula: 'MEP › Passenger lift Average Waiting Time (else Module 1 Key Ratio)',
    get: (c) => c.wait,
  },

  // ---------------- BUA efficiency, substructure
  {
    id: 'subPct',
    sane: [1, 80],
    group: 'subBua',
    label: 'Substructure Area %',
    unit: '%',
    dp: 1,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Total Basement Area',
    formula: 'Total Basement Area ÷ Built Up Area × 100',
    get: (c) => pct(c.basement, c.bua),
  },
  {
    id: 'subNonParking',
    group: 'subBua',
    label: 'Non Parking / Non Driveway / Ramps',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 80],
    status: 'captured',
    ...M6,
    focus: 'Basement Shaft Area',
    formula:
      'Sum of the basement areas below (Services + Shafts + Lobbies other than Fire Towers + Staircases other than Exit + BOH Facilities) ÷ Total Basement Area × 100',
    note: 'Shown once at least one of Shafts, Lobbies, Staircases or BOH is entered for the project.',
    get: (c) => {
      const extra = ['basementShaftArea', 'basementLobbyArea', 'basementStaircaseArea', 'basementBohArea'].map((k) => effNum(c.kr[k]))
      if (extra.every((v) => v === null)) return null
      const total = (effNum(c.kr.circulationArea) ?? 0) + extra.reduce<number>((t, v) => t + (v ?? 0), 0)
      return pct(total, c.basement)
    },
  },
  {
    id: 'subServices',
    group: 'subBua',
    label: 'Services Areas',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 60],
    status: 'captured',
    ...M6,
    focus: 'Services Area (only MEP Services Area)',
    formula: 'Key Ratio › Services Area (only MEP Services Area) ÷ Total Basement Area × 100',
    get: (c) => pct(effNum(c.kr.circulationArea), c.basement),
  },
  {
    id: 'subShafts',
    group: 'subBua',
    label: 'Shafts',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 60],
    status: 'captured',
    ...M6,
    focus: 'Basement Shaft Area',
    formula: 'Key Ratio › Basement Shaft Area ÷ Total Basement Area × 100',
    get: (c) => pct(effNum(c.kr.basementShaftArea), c.basement),
  },
  {
    id: 'subLobbies',
    group: 'subBua',
    label: 'Lobbies other than Fire Towers',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 60],
    status: 'captured',
    ...M6,
    focus: 'Basement Lobbies other than Fire Towers',
    formula: 'Key Ratio › Basement Lobbies other than Fire Towers ÷ Total Basement Area × 100',
    get: (c) => pct(effNum(c.kr.basementLobbyArea), c.basement),
  },
  {
    id: 'subStairs',
    group: 'subBua',
    label: 'Staircases other than required for Exit',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 60],
    status: 'captured',
    ...M6,
    focus: 'Basement Staircases other than required for Exit',
    formula: 'Key Ratio › Basement Staircases other than required for Exit ÷ Total Basement Area × 100',
    get: (c) => pct(effNum(c.kr.basementStaircaseArea), c.basement),
  },
  {
    id: 'subBoh',
    group: 'subBua',
    label: 'BOH Facilities',
    unit: '% of basement',
    dp: 2,
    better: 'lower',
    sane: [0, 60],
    status: 'captured',
    ...M6,
    focus: 'Basement BOH Facilities',
    formula: 'Key Ratio › Basement BOH Facilities ÷ Total Basement Area × 100',
    get: (c) => pct(effNum(c.kr.basementBohArea), c.basement),
  },
  {
    id: 'parkingEff',
    sane: [10, 90],
    group: 'subBua',
    label: 'Parking Efficiency',
    unit: 'sq m/car',
    dp: 1,
    better: 'lower',
    status: 'partial',
    ...M6,
    focus: 'Total Basement Area',
    formula: 'Module 6 "Basement parking efficiency" = (Total Basement Area − Circulation Area) in sq m ÷ Total No. of Cars',
    note: 'The sheet shows 2.5–4 here, which is a different measure; tell us how the sheet calculates it and we will match it.',
    get: (c) => {
      const cars = pos(c.kr.totalNumberOfCars) ?? pos(c.m1.total_number_of_cars)
      const circ = effNum(c.kr.circulationArea) ?? effNum(c.m1.circulation_area) ?? 0
      return c.basement && cars ? (c.basement - circ) / 10.7639 / cars : null
    },
  },

  // ---------------- BUA efficiency, superstructure
  {
    id: 'supPct',
    sane: [20, 99],
    group: 'supBua',
    label: 'Superstructure BUA %',
    unit: '%',
    dp: 1,
    status: 'captured',
    ...M6,
    focus: 'Built Up Area',
    formula: '(Built Up Area − Total Basement Area) ÷ Built Up Area × 100',
    get: (c) => (c.bua && c.basement !== null ? ((c.bua - c.basement) / c.bua) * 100 : null),
  },
  {
    id: 'stiltFree',
    group: 'supBua',
    label: 'Stilt Areas — FAR Free',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Stilt Areas — FAR Free',
    formula: 'Key Ratio › Stilt Areas — FAR Free (sq ft, as entered)',
    get: (c) => pos(c.kr.stiltAreaFarFree),
  },
  {
    id: 'stairFree',
    group: 'supBua',
    label: 'Staircases — FAR Free',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Staircases — FAR Free',
    formula: 'Key Ratio › Staircases — FAR Free (sq ft, as entered)',
    get: (c) => pos(c.kr.staircaseAreaFarFree),
  },
  {
    id: 'fireFree',
    group: 'supBua',
    label: 'Fire Tower — FAR Free',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Fire Tower — FAR Free',
    formula: 'Key Ratio › Fire Tower — FAR Free (sq ft, as entered)',
    get: (c) => pos(c.kr.fireTowerAreaFarFree),
  },
  {
    id: 'balconyArea',
    group: 'supBua',
    label: 'Balcony Area',
    unit: 'lacs sq ft',
    dp: 2,
    status: 'captured',
    ...M6,
    focus: 'Balcony Area',
    formula: 'Key Ratio › Balcony Area ÷ 1,00,000',
    get: (c) => lacs(c.balcony),
  },
  {
    id: 'shaftArea',
    group: 'supBua',
    label: 'Shaft Area',
    unit: 'sq ft',
    dp: 0,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Service Shaft Area',
    formula: 'Key Ratio › Service Shaft Area (else Module 1 Key Ratio)',
    get: (c) => pos(c.kr.serviceShaftArea) ?? pos(c.m1.service_shaft_area),
  },

  // ---------------- FAR efficiency, superstructure
  {
    id: 'gfLobbies',
    group: 'supFar',
    label: 'Ground Floor Lobbies',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Ground Floor Lobbies (in FAR)',
    formula: 'Key Ratio › Ground Floor Lobbies (in FAR) (sq ft, as entered)',
    get: (c) => pos(c.kr.groundFloorLobbyFar),
  },
  {
    id: 'toilets',
    group: 'supFar',
    label: 'Toilets',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Toilets (in FAR)',
    formula: 'Key Ratio › Toilets (in FAR) (sq ft, as entered)',
    get: (c) => pos(c.kr.toiletAreaFar),
  },
  {
    id: 'supServices',
    group: 'supFar',
    label: 'Services Areas',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'Services Areas (in FAR)',
    formula: 'Key Ratio › Services Areas (in FAR) (sq ft, as entered)',
    get: (c) => pos(c.kr.servicesAreaFar),
  },
  {
    id: 'farPerEws',
    sane: [50, 1000],
    group: 'supFar',
    label: 'FAR per EWS',
    unit: 'sq ft',
    dp: 0,
    status: 'captured',
    ...M6,
    focus: 'EWS FAR',
    formula: 'Key Ratio › EWS FAR ÷ No. of EWS Units',
    get: (c) => div(pos(c.kr.ewsFAR), pos(c.kr.noOfEWSUnit)),
  },

  // ---------------- FAR efficiency, typical floor (Module 6 Cluster level Parameters)
  {
    id: 'coreArea',
    sane: [0.5, 40],
    group: 'typFar',
    label: 'Core Area',
    unit: '% of floor FAR',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Non Saleable FAR',
    formula: 'Cluster level Parameters › Non Saleable FAR ÷ Floor FAR × 100 (all clusters, weighted by floor FAR)',
    get: (c) => c.clusterPct('nonSaleableFAR', 'floorFAR'),
  },
  {
    id: 'balconyInFar',
    sane: [0, 60],
    group: 'typFar',
    label: 'Balcony in FAR',
    unit: '% of unit FAR',
    dp: 1,
    status: 'captured',
    ...M7,
    focus: 'Balcony Area FAR',
    formula: 'Unit Level Design › Σ(Balcony Area FAR × units) ÷ Σ(Unit FAR × units) × 100',
    get: (c) => pct(c.unitFar ? c.balFar : null, c.unitFar || null),
  },
  {
    id: 'structArea',
    sane: [0.5, 25],
    group: 'typFar',
    label: 'Structure Elements Area',
    unit: '% of floor BUA',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Structure Footprint Area',
    formula: 'Cluster level Parameters › Structure Footprint Area ÷ Floor BUA × 100',
    get: (c) => c.clusterPct('structureFootprintArea', 'floorBUA'),
  },
  {
    id: 'floorShaft',
    sane: [0.5, 25],
    group: 'typFar',
    label: 'Shaft Area (typical floor)',
    unit: '% of floor BUA',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Floor Shaft Area',
    formula: 'Cluster level Parameters › Floor Shaft Area ÷ Floor BUA × 100',
    note: 'Extra row (not in the sheet) — already entered for most projects.',
    get: (c) => c.clusterPct('floorShaftArea', 'floorBUA'),
  },
  {
    id: 'nonFarBua',
    sane: [0, 25],
    group: 'typFar',
    label: 'Non FAR BUA (excl. balcony)',
    unit: '% of floor BUA',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Non FAR BUA',
    formula: 'Cluster level Parameters › Non FAR BUA ÷ Floor BUA × 100',
    note: 'Extra row (not in the sheet) — already entered for most projects.',
    get: (c) => c.clusterPct('nonFARBUA', 'floorBUA'),
  },

  // ---------------- other cost related
  {
    id: 'window',
    sane: [1, 100],
    group: 'cost',
    label: 'Window Area',
    unit: '% of façade',
    dp: 1,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Window Opening Area',
    formula: 'Cluster level Parameters › Window Opening Area ÷ Wall Perimeter Area × 100 (else Key Ratio › Window to Wall Ratio)',
    get: (c) => c.clusterPct('windowOpeningArea', 'wallPerimeterArea') ?? pos(c.kr.windowToAreaRatio) ?? pos(c.m1.window_to_area_ratio),
  },
  {
    id: 'steelTotal',
    group: 'cost',
    label: 'Steel Consumption',
    unit: 'MT',
    dp: 0,
    status: 'captured',
    ...M8,
    focus: 'Total Steel Consumption',
    formula: 'Structures › Total Steel Consumption (kg) ÷ 1,000',
    get: (c) =>
      pos(c.st.totalSteelConsumption) ? pos(c.st.totalSteelConsumption)! / 1000 : c.steelCoef && c.bua ? (c.steelCoef * c.bua) / 1000 : null,
  },
  {
    id: 'concreteCoef',
    sane: [0.01, 0.2],
    group: 'cost',
    label: 'Concrete Coefficient',
    unit: 'cum/sq ft',
    dp: 3,
    better: 'lower',
    status: 'captured',
    ...M8,
    focus: 'Concrete Consumption Coefficient',
    formula: 'Structures › Concrete Consumption Coefficient',
    get: (c) => pos(c.st.concreteConsumptionCoefficient),
  },
  {
    id: 'concreteGrade2',
    group: 'cost',
    label: 'Max Grade of Concrete',
    status: 'captured',
    ...M8,
    focus: 'Max Grade of Concrete',
    formula: 'Structures › Max. Grade of Concrete',
    get: (c) => str(c.st.maxGradeOfConcrete) || null,
  },
  {
    id: 'lifts2',
    sane: [1, 12],
    group: 'cost',
    label: 'Lifts per Tower',
    dp: 0,
    status: 'captured',
    ...M9,
    focus: 'Passenger Lifts',
    formula: 'MEP › Passenger Lifts (no.) per tower',
    get: (c) => c.lifts,
  },
  {
    id: 'wait2',
    sane: [5, 180],
    group: 'cost',
    label: 'Average Waiting Time',
    unit: 'sec',
    dp: 0,
    better: 'lower',
    status: 'captured',
    ...M9,
    focus: 'Average Waiting Time',
    formula: 'MEP › Passenger lift Average Waiting Time',
    get: (c) => c.wait,
  },
  {
    id: 'basementHeights',
    group: 'cost',
    label: 'Basement Heights',
    unit: 'm',
    status: 'captured',
    ...M6,
    focus: 'B1',
    formula: 'Key Ratio › Floor to Floor Heights B1–GF / B2–B1 / B3–B2',
    get: (c) => {
      const hs = [c.b1, ...c.lower]
      return c.b1 === null && !c.lower.length ? null : hs.map((h) => (h === null ? '–' : h.toFixed(2))).join(' / ')
    },
  },
  {
    id: 'f2f',
    sane: [2.5, 6],
    group: 'cost',
    label: 'Floor to Floor Heights',
    unit: 'm',
    dp: 2,
    better: 'lower',
    status: 'captured',
    ...M6,
    focus: 'Floor to Floor Height Apt',
    formula: 'Key Ratio › Floor to Floor Height (Apartment); millimetre entries are read as metres',
    get: (c) => metres(c.kr.floorToFloorHeightApt) ?? metres(c.m1.floor_to_floor_height_apt),
  },
  {
    id: 'fillMargin2',
    group: 'cost',
    label: 'Landscape Filling Margin',
    unit: 'm',
    dp: 2,
    sane: [0, 5],
    status: 'captured',
    ...M6,
    focus: 'Landscape Filling Margin',
    formula: 'Key Ratio › Landscape Filling Margin; by default Floor to Floor Height (B1–GF) Tower Area − Non Tower Area (editable)',
    get: (c) => fillingMargin(c.kr).value,
  },
]

export const EFF_ROWS: EffRowMeta[] = ROWS.map(({ get: _g, ...meta }) => meta) // eslint-disable-line @typescript-eslint/no-unused-vars

/** one project's value for every row (null = not entered / not captured) */
export function efficiencyValues(x: EffInput): Record<string, EffValue> {
  const c = context(x)
  const out: Record<string, EffValue> = {}
  for (const r of ROWS) {
    let v: EffValue = null
    try {
      v = r.get ? r.get(c) : null
    } catch {
      v = null
    }
    out[r.id] = typeof v === 'number' && !Number.isFinite(v) ? null : v
  }
  return out
}

/* ------------------------------------------------------------------ ranking helpers used by the dashboard */
/** a number outside the row's plausible range (a units / entry mistake) */
export const outOfRange = (meta: EffRowMeta, v: EffValue) => typeof v === 'number' && !!meta.sane && (v < meta.sane[0] || v > meta.sane[1])
export type RowStats = {
  n: number
  avg: number | null
  min: number | null
  max: number | null
  bestId: string | null
  worstId: string | null
  sd: number | null
}
export function rowStats(meta: EffRowMeta, values: { id: string; v: EffValue }[]): RowStats {
  const xs = values.filter((x): x is { id: string; v: number } => typeof x.v === 'number' && !outOfRange(meta, x.v))
  if (!xs.length) return { n: 0, avg: null, min: null, max: null, bestId: null, worstId: null, sd: null }
  const vs = xs.map((x) => x.v)
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length
  const sd = vs.length > 1 ? Math.sqrt(vs.reduce((a, b) => a + (b - avg) ** 2, 0) / (vs.length - 1)) : null
  const lo = xs.reduce((a, b) => (b.v < a.v ? b : a))
  const hi = xs.reduce((a, b) => (b.v > a.v ? b : a))
  const best = meta.better === 'lower' ? lo : meta.better === 'higher' ? hi : null
  const worst = meta.better === 'lower' ? hi : meta.better === 'higher' ? lo : null
  return {
    n: xs.length,
    avg,
    min: lo.v,
    max: hi.v,
    bestId: xs.length > 1 ? (best?.id ?? null) : null,
    worstId: xs.length > 1 ? (worst?.id ?? null) : null,
    sd,
  }
}

/** 0 (worst) … 1 (best) within the row; null when the row isn't ranked or has < 2 values */
export function rankScore(meta: EffRowMeta, s: RowStats, v: EffValue): number | null {
  if (typeof v !== 'number' || outOfRange(meta, v) || !meta.better || s.n < 2 || s.min === null || s.max === null || s.max === s.min) return null
  const t = (v - s.min) / (s.max - s.min)
  return meta.better === 'higher' ? t : 1 - t
}

/** worse than the average by more than one standard deviation (shown red, like the sheet) */
export function isOutlier(meta: EffRowMeta, s: RowStats, v: EffValue) {
  if (typeof v !== 'number' || outOfRange(meta, v) || !meta.better || s.avg === null || !s.sd || s.n < 3) return false
  return meta.better === 'lower' ? v > s.avg + s.sd : v < s.avg - s.sd
}
