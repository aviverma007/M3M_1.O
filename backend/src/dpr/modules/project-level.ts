/*
 * DPR — Project Level Design (summary.projectLevelDesignData):
 *   Development Area Statement · Project Level Parameters (+ Additional Elements) · Key Ratio ·
 *   Additional Elements 2/2 (cluster level design) · Area Ratios Comparison.
 */
import { contentPage, emptyMessage, txt, type Ctx, type Doc } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import type { DprInput } from '../index.js'
import { areaStatement, comparisonRatios, keyRatioFormula } from '@/components/design-chapters/project-level/calc'
import type { AdditionalElements2, AreaStatementInputs, ClusterConfig, KeyRatioInputs, ParkingReq, ProjectLevelDesignData } from '@/types/chapters-a'

/* ------------------------------------------------------------------ benchmark rules (same as frontend lib/benchmark.ts) */
type Benchmark = { benchmarkValue?: string; validOptions?: string[] }
type BenchmarkMap = Record<string, Benchmark>

function normalizeKey(label: unknown) {
  return String(label || '')
    .replace(/\s*[–—-]+\s*(Benchmark\s*)?(Req(uired)?\.?)$/i, '')
    .replace(/[()]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9 %]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isDeviation(value: unknown, b?: Benchmark | null) {
  if (!b) return false
  const v = String(value ?? '').trim()
  if (!v || v === '-' || /^not\s+(stated|found|provided|applicable)$/i.test(v)) return true
  const bv = String(b.benchmarkValue || '').trim()
  if (!bv || /^not\s+(stated|found|explicitly)/i.test(bv)) {
    if (b.validOptions?.length) {
      const lv = v.toLowerCase()
      if (!b.validOptions.some((o) => lv.includes(o.toLowerCase()) || o.toLowerCase().includes(lv))) return true
    }
    return false
  }
  if ((/^yes\b/i.test(bv) && /^no$/i.test(v)) || (/^no\b/i.test(bv) && /^yes$/i.test(v))) return true
  const range = bv.match(/([0-9]+(?:\.[0-9]+)?)\s*%?\s*(?:[-–—]|to)\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (range) {
    const lo = parseFloat(range[1])
    const hi = parseFloat(range[2])
    const n = parseFloat(v.replace(/[^0-9.]/g, ''))
    return !isNaN(lo) && !isNaN(hi) && !isNaN(n) ? n < lo || n > hi : false
  }
  const min = bv.match(/^([0-9]+(?:\.[0-9]+)?)/)
  if (min) {
    const m = parseFloat(min[1])
    if (!isNaN(m) && m !== 0) {
      const n = parseFloat(v.replace(/[^0-9.]/g, ''))
      if (!isNaN(n)) return n < m
    }
    return false
  }
  if (b.validOptions?.length) {
    const norm = (s: string) => s.toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim()
    const nv = norm(v)
    const nb = norm(bv)
    const matching = b.validOptions.filter((o) => nb.includes(norm(o)))
    if (matching.length === 1) {
      const m = norm(matching[0])
      if (!nv.includes(m) && !m.includes(nv)) return true
    } else if (!b.validOptions.some((o) => nv.includes(norm(o)) || norm(o).includes(nv))) return true
  }
  return false
}

function getBenchmark(label: unknown, map: BenchmarkMap | null | undefined) {
  if (!map || !label) return null
  const key = normalizeKey(label)
  let hit: Benchmark | null = null
  let len = 0
  for (const [mk, b] of Object.entries(map)) {
    if (Math.min(key.length, mk.length) >= 10 && (key.includes(mk) || mk.includes(key)) && mk.length > len) {
      hit = b
      len = mk.length
    }
  }
  return map[key] ?? hit
}

function formatBenchmark(b: Benchmark | null | undefined) {
  if (!b) return null
  const raw = String(b.benchmarkValue || '').trim()
  if (!raw || /^not\s+(stated|found|explicitly)/i.test(raw)) return null
  const t = raw.replace(/\s*\(.*?\)\s*/g, '').trim() || raw
  const isRange = /[0-9]+(?:\.[0-9]+)?\s*(?:[-–—]|to)\s*[0-9]+(?:\.[0-9]+)?/i.test(t)
  const isNumber = /^[0-9]+(?:\.[0-9]+)?(\s*[a-zA-Z%/]+)?$/.test(t)
  return !isRange && isNumber ? `Min ${t}` : t
}

/** benchmark verdict for a displayed value: null = no benchmark */
function bench(labels: string[], value: string, map: BenchmarkMap | undefined) {
  if (!map || value === '-' || value === '') return null
  for (const l of labels) {
    const b = getBenchmark(l, map)
    const req = formatBenchmark(b)
    if (b && req) return { dev: isDeviation(value, b), req: `Req: ${req}` }
  }
  return null
}

/* ------------------------------------------------------------------ helpers */
const RED = '#DC2626'
const GREEN = '#16A34A'
const TEXT = '#1A202C'
const NAVY = '#1A3566'
const BORDER = '#CBD5E0'
const LIMIT = 530

const num = (v: unknown) => parseFloat(String(v ?? '')) || 0
const str = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v).trim()
  return s === '' ? '-' : s
}
/** top of text whose baseline should sit at `top + size*1.01` (pdfkit positions by top) */
const lh = (size: number) => size * 1.35

function line(doc: Doc, x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
  doc.lineWidth(w).moveTo(x1, y1).lineTo(x2, y2).stroke(color)
}
function center(doc: Doc, s: string, x0: number, x1: number, y: number, font: 'R' | 'S' | 'B', size: number, color: string) {
  doc.font(font).fontSize(size)
  const w = doc.widthOfString(s)
  txt(doc, s, x0 + (x1 - x0 - w) / 2, y, font, size, color)
}
/** pdfkit-wrapped text in a box (same line breaking / centring as the original) */
function box(doc: Doc, s: string, x: number, y: number, width: number, font: 'R' | 'S' | 'B', size: number, color: string, align: 'left' | 'center' = 'left') {
  doc.font(font).fontSize(size).fillColor(color).text(s, x, y, { width, align })
}
function boxH(doc: Doc, s: string, width: number, font: 'R' | 'S' | 'B', size: number) {
  doc.font(font).fontSize(size)
  return doc.heightOfString(s, { width })
}
/** value + grey unit, horizontally centred as one string (key ratio table) */
function centerWithUnit(doc: Doc, v: string, unit: string, x0: number, x1: number, y: number, color: string) {
  doc.font('S').fontSize(9)
  const wv = doc.widthOfString(v)
  doc.font('R').fontSize(8)
  const wu = unit ? doc.widthOfString(` ${unit}`) : 0
  const x = x0 + (x1 - x0 - wv - wu) / 2
  txt(doc, v, x, y, 'S', 9, color)
  if (unit) txt(doc, ` ${unit}`, x + wv, y + 1.01, 'R', 8, '#999999')
}
/* ------------------------------------------------------------------ 1. Development Area Statement */
const inr = (o: number) => (o ? Number(o.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-')
const fx = (o: number) => (o ? o.toFixed(2) : '-')

type ARow = { label: string; mid: string; sqm: string; bold?: boolean }
type ABlock = { head: [string, string, string]; sections: { title?: string; rows: ARow[] }[]; check?: { acre: string; sqm: string; reqAcre: string; reqSqm: string; over: boolean } }

function areaStatementPage(ctx: Ctx, p: AreaStatementInputs) {
  const { doc } = ctx
  contentPage(ctx, 'Design Considerations – Development Area Statement')
  const a = areaStatement(p)
  const X = [35, 375, 560, 806.89]
  const blocks: ABlock[] = [
    {
      head: ['DESCRIPTION', 'ACRES', 'SQ.M.'],
      sections: [
        {
          title: 'AREA SUMMARY',
          rows: [
            { label: 'Licensed Area of Site', mid: fx(a.licensedAreaAcre), sqm: inr(a.licensedSqm) },
            { label: 'Area of Residential Site as per Zoning', mid: fx(a.residentialAcre), sqm: inr(a.residentialSqm), bold: true },
            { label: 'TOD Transition Land', mid: fx(a.todLandAcre), sqm: inr(a.todSqm) },
            { label: 'Non-TOD Land', mid: fx(a.nonTodLandAcre), sqm: inr(a.nonTodSqm) },
            { label: 'Area of Commercial Site as per Zoning', mid: fx(a.commercialAcre), sqm: inr(a.commSqm) },
          ],
        },
      ],
      check: { acre: fx(a.checkAcre), sqm: inr(a.checkSqm), reqAcre: fx(a.licensedAreaAcre), reqSqm: inr(a.licensedSqm), over: Math.abs(a.checkSqm - a.licensedSqm) > 0.5 },
    },
    {
      head: ['', 'FACTOR', 'FAR in Sq.M.'],
      sections: [
        {
          title: 'TOD TRANSITION LAND',
          rows: [
            { label: 'Base FAR', mid: fx(num(p.todBaseFar)), sqm: inr(a.todBaseFARsqm) },
            { label: 'GRIHA', mid: fx(num(p.todGriha)), sqm: inr(a.todGrihaSqm) },
            { label: 'TDR', mid: fx(num(p.todTdr)), sqm: inr(a.todTdrSqm) },
            { label: 'TOD Transition Land – Total (X)', mid: fx(a.todFactorX), sqm: inr(a.todTotalFARsqm), bold: true },
          ],
        },
        {
          title: 'NON-TOD LAND',
          rows: [
            { label: 'Base FAR', mid: fx(num(p.nonTodBaseFar)), sqm: inr(a.nonTodBaseFARsqm) },
            { label: 'GRIHA', mid: fx(num(p.nonTodGriha)), sqm: inr(a.nonTodGrihaSqm) },
            { label: 'TDR', mid: fx(num(p.nonTodTdr)), sqm: inr(a.nonTodTdrSqm) },
            { label: 'Non-TOD Land – Total (Y)', mid: fx(a.nonTodFactorY), sqm: inr(a.nonTodTotalFARsqm), bold: true },
            { label: 'Total Permissible Residential FAR (X+Y)', mid: fx(a.blendedFAR), sqm: inr(a.totalPermissibleFARsqm), bold: true },
            { label: 'Proposed FAR for Residential', mid: a.proposedFarPct ? `${a.proposedFarPct.toFixed(2)}%` : '-', sqm: inr(a.proposedFARsqm), bold: true },
          ],
        },
      ],
    },
    {
      head: ['', 'PERCENTAGE', 'SQ.M.'],
      sections: [
        {
          title: 'GROUND COVERAGE',
          rows: [
            { label: 'Permissible Ground Coverage', mid: `${num(p.permissibleGcPct).toFixed(2)}%`, sqm: inr(a.permissibleGcSqm) },
            { label: 'Proposed Ground Coverage', mid: a.proposedGcPct ? `${a.proposedGcPct.toFixed(2)}%` : '-', sqm: inr(num(p.proposedGcSqm)) },
          ],
        },
      ],
    },
  ]
  const BLUE = '#00509D'
  let y = 78
  blocks.forEach((b) => {
    doc.rect(X[0], y, X[3] - X[0], 22).fill(BLUE)
    // the original strokes these without setting a colour (current stroke colour of the page)
    doc.lineWidth(0.4).moveTo(X[1], y).lineTo(X[1], y + 22).stroke()
    doc.lineWidth(0.4).moveTo(X[2], y).lineTo(X[2], y + 22).stroke()
    if (b.head[0]) txt(doc, b.head[0], 43, y + 7.53, 'S', 7, '#FFFFFF')
    center(doc, b.head[1], X[1], X[2], y + 7.53, 'S', 7, '#FFFFFF')
    center(doc, b.head[2], X[2], X[3], y + 7.53, 'S', 7, '#FFFFFF')
    y += 22
    b.sections.forEach((s) => {
      if (s.title) {
        doc.rect(X[0], y, X[3] - X[0], 14).fill('#F0F5FF')
        doc.rect(X[0], y, 3, 14).fill(BLUE)
        line(doc, X[0], y + 14, X[3], y + 14, '#C7D8F0', 0.3)
        txt(doc, s.title, 45, y + 3.53, 'S', 7, BLUE)
        y += 14
      }
      s.rows.forEach((r, i) => {
        doc.rect(X[0], y, X[3] - X[0], 18).fill(i % 2 ? '#F8FAFC' : '#FFFFFF')
        line(doc, X[0], y + 18, X[3], y + 18, '#E5E7EB', 0.3)
        line(doc, X[1], y, X[1], y + 18, '#E5E7EB', 0.3)
        line(doc, X[2], y, X[2], y + 18, '#E5E7EB', 0.3)
        const c = r.bold ? BLUE : TEXT
        txt(doc, r.label, 43, y + 5.53, r.bold ? 'B' : 'R', 7, c)
        center(doc, r.mid, X[1], X[2], y + 5.53, r.bold ? 'B' : 'S', 7, c)
        center(doc, r.sqm, X[2], X[3], y + 5.53, r.bold ? 'B' : 'S', 7, c)
        y += 18
      })
    })
    if (b.check) {
      const k = b.check
      const [bg, c, sub] = k.over ? ['#FEF2F2', RED, '#B91C1C'] : ['#F0FDF4', GREEN, '#15803D']
      doc.rect(X[0], y, X[3] - X[0], 28.5).fill(bg)
      line(doc, X[0], y + 28.5, X[3], y + 28.5, '#E5E7EB', 0.3)
      line(doc, X[1], y, X[1], y + 28.5, '#E5E7EB', 0.3)
      line(doc, X[2], y, X[2], y + 28.5, '#E5E7EB', 0.3)
      txt(doc, 'Check: Residential + Commercial', 43, y + 5.03, 'S', 7, c)
      txt(doc, 'Should be ≈ Licensed area', 43, y + 15.05, 'R', 5.5, sub)
      center(doc, k.acre, X[1], X[2], y + 5.03, 'S', 7, c)
      center(doc, `Req: ${k.reqAcre}`, X[1], X[2], y + 15.05, 'R', 5.5, sub)
      center(doc, k.sqm, X[2], X[3], y + 5.03, 'S', 7, c)
      center(doc, `Req: ${k.reqSqm}`, X[2], X[3], y + 15.05, 'R', 5.5, sub)
      y += 28.5
    }
    y += 6
  })
}

/* ------------------------------------------------------------------ 2. Project Level Parameters */
type PRow =
  | { kind: 'row'; label: string; value: string; unit: string; lines?: string[]; benchLabels?: string[] }
  | { kind: 'section'; label: string }

function paramsPages(ctx: Ctx, rows: PRow[], benchmarks: BenchmarkMap | undefined) {
  const { doc } = ctx
  const L = 35
  const R = 765
  const SPLIT = 335
  const title = 'Design Considerations — Project Level Parameters'
  let y = 0
  let stripe = 0
  const header = () => {
    contentPage(ctx, title)
    y = 80
    doc.rect(L, y, R - L, 32.15).fill(NAVY)
    doc.lineWidth(0.5).rect(L, y, R - L, 32.15).stroke(BORDER)
    txt(doc, 'Key Parameters', 43, y + 7, 'S', 9, '#FFFFFF')
    txt(doc, 'Specification / Value', 343, y + 7, 'S', 9, '#FFFFFF')
    line(doc, SPLIT, y + 3, SPLIT, y + 29.15, BORDER, 0.5)
    y += 32.15
    stripe = 0
  }
  header()
  for (const r of rows) {
    if (r.kind === 'section') {
      if (y + 22 > LIMIT) header()
      doc.rect(L, y, R - L, 22).fill('#1E3A5F')
      doc.lineWidth(0.5).rect(L, y, R - L, 22).stroke(BORDER)
      txt(doc, r.label, 45, y + 5.9, 'B', 10, '#FFFFFF')
      y += 22
      stripe = 0
      continue
    }
    const b = r.lines ? null : bench(r.benchLabels ?? [r.label], r.value, benchmarks)
    const valueLines = r.lines ?? [r.value]
    doc.font('S').fontSize(9)
    const labelH = doc.heightOfString(r.label, { width: SPLIT - 43 - 8 })
    const valH = valueLines.length * lh(9) + (b ? 3 + lh(7) : 0)
    const h = Math.max(labelH, valH) + 12
    if (y + h > LIMIT) header()
    doc.rect(L, y, R - L, h).fill(stripe++ % 2 ? '#F0F4F8' : '#FFFFFF')
    doc.font('S').fontSize(9).fillColor(TEXT).text(r.label, 43, y + 5, { width: SPLIT - 43 - 8 })
    const vc = b ? (b.dev ? RED : GREEN) : TEXT
    valueLines.forEach((v, i) => {
      const ty = y + 5 + i * lh(9)
      txt(doc, v, 343, ty, 'S', 9, vc)
      if (!r.lines && r.unit && v !== '-') {
        doc.font('S').fontSize(9)
        txt(doc, ` ${r.unit}`, 343 + doc.widthOfString(v), ty + 1.01, 'R', 8, '#999999')
      }
    })
    if (b) txt(doc, b.req, 343, y + 5 + lh(9) + 2, 'R', 7, b.dev ? RED : '#6B7280')
    line(doc, SPLIT, y, SPLIT, y + h, BORDER, 0.5)
    line(doc, L, y + h, R, y + h, BORDER, 0.5)
    line(doc, L, y, L, y + h, BORDER, 0.5)
    line(doc, R, y, R, y + h, BORDER, 0.5)
    y += h
  }
}

const KR_PARAMS: { label: string; key: string; unit: string; legacy?: boolean; bench?: string }[] = [
  { label: 'Building Height', key: 'buildingHeight', unit: 'm' },
  { label: 'Carpet Area', key: 'carpetArea', unit: 'sq ft' },
  { label: 'Saleable Area', key: 'saleableArea', unit: 'sq ft' },
  { label: 'Balcony Area', key: 'balconyArea', unit: 'sq ft' },
  { label: 'Built Up Area', key: 'builtUpArea', unit: 'sq ft' },
  { label: 'FAR', key: 'far', unit: 'sq ft' },
  { label: 'Total External Wall Area', key: 'totalExternalWallArea', unit: 'sq ft' },
  { label: 'Service Shaft Area', key: 'serviceShaftArea', unit: 'sq ft' },
  { label: 'Window to Area Ratio', key: 'windowToAreaRatio', unit: '' },
  { label: 'Permissible F A R', key: 'permissibleFAR', unit: 'sq ft', bench: 'Permissible FAR' },
  { label: 'No. of EWS Unit', key: 'noOfEWSUnit', unit: '' },
  { label: 'EWS FAR', key: 'ewsFAR', unit: 'sq ft', bench: 'EWS FAR (Sqft)' },
  { label: 'Floor to Floor Height Apt', key: 'floorToFloorHeightApt', unit: 'm' },
  { label: 'Average Wall Area (Interior + Exterior) Per Unit', key: 'avgWallArea', unit: 'sq ft' },
  { label: 'No. Of Units', key: 'noOfUnits', unit: '' },
  { label: 'Total Basement Area', key: 'totalBasementArea', unit: 'sq ft' },
  { label: 'Services Area (only MEP Services Area)', key: 'circulationArea', unit: 'sq ft' },
  { label: 'Total Parking Area', key: 'totalParkingArea', unit: 'sq ft' },
  { label: 'Total Number Of Cars', key: 'totalNumberOfCars', unit: '' },
  { label: 'Lobby Corridor Width', key: 'lobbyCorridorWidth', unit: 'm' },
  { label: 'Driveway Width Basement', key: 'drivewayWidthBasement', unit: 'm' },
  { label: 'Floor to Floor Height Ground Lobby', key: 'floorToFloorHeightGroundLobby', unit: 'm' },
  { label: 'Floor to Floor Height Basement B1 B2', key: 'floorToFloorHeightBasementB1B2', unit: 'm', legacy: true },
  { label: 'Floor to Floor Height (B1 - GF) Tower Area', key: 'floorToFloorHeightB1GFTower', unit: 'm' },
  { label: 'Floor to Floor Height (B1 - GF) Non Tower Area', key: 'floorToFloorHeightB1GFNonTower', unit: 'm' },
  { label: 'Floor to Floor Height (B2 - B1)', key: 'floorToFloorHeightB2B1', unit: 'm' },
  { label: 'Floor to Floor Height (B3 - B2)', key: 'floorToFloorHeightB3B2', unit: 'm' },
  { label: 'Average Wall Area (Interior + Exterior) Per Basement', key: 'avgWallAreaBasement', unit: 'sq ft', legacy: true },
  { label: 'Number of Basements', key: 'noOfBasements', unit: '', bench: 'No. of Basements' },
]

const OTHER_PARAMS: { label: string; key: string; unit: string; legacy?: boolean; bench?: string }[] = [
  { label: 'Ground Floor Entrance Lobby Type', key: 'groundFloorEntranceLobby', unit: '' },
  { label: 'Typical Floor', key: 'typicalFloor', unit: '' },
  { label: 'Floor To Floor Height Stilt', key: 'stilt', unit: '' },
  { label: 'Floor To Floor Height Penthouse', key: 'pentHouse', unit: '' },
  { label: 'Penthouse Planning', key: 'pentHousePlanning', unit: '' },
  { label: 'Units on Ground Floor', key: 'unitsOnGroundFloor', unit: '' },
  { label: 'Surface Driveway Width', key: 'surfaceDrivewayWidth', unit: 'm' },
  { label: 'Ramps & Entry to Basement Width', key: 'rampsEntryToBasementWidth', unit: 'm' },
  { label: 'Basement Clear Height (Ramp Entrance)', key: 'basementClearHeightRamp', unit: 'm' },
  { label: 'Basement Clear Height (Below Services)', key: 'basementClearHeightB1', unit: 'm' },
  { label: 'Total Parking Bay size', key: 'totalParkingBaySize', unit: 'sqft' },
  { label: 'No. of parking slots', key: 'noOfParkingSlots', unit: 'Nos.' },
  { label: 'Unit Parking Size', key: 'unitParkingSize', unit: '', legacy: true },
]

function parameterRows(l: KeyRatioInputs, extra: AdditionalElements2 | undefined): PRow[] {
  const rows: PRow[] = []
  const has = (o: Record<string, unknown>, k: string) => o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== ''
  for (const f of KR_PARAMS) {
    if (f.legacy && !has(l, f.key)) continue
    rows.push({ kind: 'row', label: f.label, value: str(l[f.key]), unit: f.unit, benchLabels: [f.label, ...(f.bench ? [f.bench] : [])] })
  }
  rows.push({ kind: 'section', label: 'Additional Elements' })
  const o = (extra?.other ?? {}) as Record<string, unknown>
  for (const f of OTHER_PARAMS) {
    if (f.legacy && !has(o, f.key)) continue
    rows.push({ kind: 'row', label: f.label, value: str(o[f.key]), unit: f.unit })
  }
  const reqs = ((o.extraParkingReqs as ParkingReq[] | undefined) ?? []).filter((r) => r && (r.label || r.value))
  if (reqs.length) rows.push({ kind: 'row', label: 'Extra Parking Reqs', value: '', unit: '', lines: reqs.flatMap((r) => [`Label: ${r.label ?? ''}`, `Value: ${r.value ?? ''}`]) })
  rows.push({ kind: 'row', label: 'Openings To Ground Floor Lobby', value: str(o.openingsToGroundFloorLobby), unit: '' })
  reqs.forEach((r) => rows.push({ kind: 'row', label: str(r.label), value: str(r.value), unit: 'Nos.' }))
  return rows
}

/* ------------------------------------------------------------------ 3. Key Ratio */
type KRow = { label: string; value: string; unit: string; bench?: string[] }

function keyRatioPages(ctx: Ctx, groups: { name: string; rows: KRow[] }[], benchmarks: BenchmarkMap | undefined) {
  const { doc } = ctx
  const L = 35
  const R = 806.89
  const C1 = 125
  const C2 = 525
  let y = 0
  const header = () => {
    contentPage(ctx, 'Design Considerations — Key Ratio')
    y = 80
    doc.rect(L, y, R - L, 20).fill(NAVY)
    txt(doc, 'Element', 39, y + 6, 'B', 8, '#FFFFFF')
    doc.lineWidth(0.4).moveTo(C1, y + 3).lineTo(C1, y + 17).stroke()
    txt(doc, 'Parameters', 129, y + 6, 'B', 8, '#FFFFFF')
    doc.lineWidth(0.4).moveTo(C2, y + 3).lineTo(C2, y + 17).stroke()
    center(doc, 'Value', C2, R, y + 6, 'B', 8, '#FFFFFF')
    y += 20
  }
  header()
  for (const g of groups) {
    const rows = g.rows.map((r) => {
      const b = r.value === '-' ? null : bench(r.bench ?? [r.label], r.value, benchmarks)
      doc.font('S').fontSize(8)
      const ph = doc.heightOfString(r.label, { width: C2 - 129 - 4 })
      const h = Math.max(24, Math.max(ph, lh(9) + (b ? 2 + lh(5.5) : 0)) + 8)
      return { ...r, b, h }
    })
    const total = rows.reduce((s, r) => s + r.h, 0)
    if (y + total > LIMIT && y > 100) header()
    doc.rect(L, y, C1 - L, total).fill('#DCE8F5')
    doc.lineWidth(0.4).rect(L, y, C1 - L, total).stroke(BORDER)
    const gh = boxH(doc, g.name.toUpperCase(), C1 - L - 8, 'B', 8)
    box(doc, g.name.toUpperCase(), L + 4, y + total / 2 - gh / 2, C1 - L - 8, 'B', 8, NAVY, 'center')
    rows.forEach((r, i) => {
      doc.rect(C1, y, R - C1, r.h).fill(i % 2 ? '#F0F4F8' : '#FFFFFF')
      doc.lineWidth(0.3).rect(C1, y, R - C1, r.h).stroke(BORDER)
      doc.font('S').fontSize(8).fillColor(TEXT).text(r.label, 129, y + 4, { width: C2 - 129 - 4 })
      line(doc, C2, y, C2, y + r.h, BORDER, 0.3)
      centerWithUnit(doc, r.value, r.value === '-' ? '' : r.unit, C2, R, y + 4, r.b?.dev ? RED : TEXT)
      if (r.b) center(doc, r.b.req, C2, R, y + 4 + lh(9) + 2, 'R', 5.5, r.b.dev ? RED : GREEN)
      y += r.h
    })
    line(doc, L, y, R, y, BORDER, 0.4)
  }
}

const ratio = (a: number, b: number) => (a && b ? (a / b).toFixed(2) : '-')

function keyRatioGroups(l: KeyRatioInputs, extra: AdditionalElements2 | undefined) {
  const o = (extra?.other ?? {}) as Record<string, unknown>
  const farUtil = keyRatioFormula(27, l)
  const cars = num(l.totalNumberOfCars)
  const has = (k: string) => l[k] !== undefined && l[k] !== null && String(l[k]).trim() !== ''
  const v = (k: string) => str(l[k])
  const groups: { name: string; rows: KRow[] }[] = [
    {
      name: 'Efficiency',
      rows: [
        { label: 'Carpet Area/Saleable', value: ratio(num(l.carpetArea), num(l.saleableArea)), unit: '' },
        { label: 'BUA/Saleable', value: str(keyRatioFormula(4, l)), unit: '' },
        { label: 'BUA/FAR', value: ratio(num(l.builtUpArea), num(l.far)), unit: '' },
        { label: 'Saleable/FAR', value: str(keyRatioFormula(5, l)), unit: '' },
        { label: 'FAR Utilization', value: farUtil && num(l.permissibleFAR) ? `${Number(Number(farUtil).toFixed(0))}%` : '-', unit: '' },
        { label: 'FAR per EWS', value: ratio(num(l.ewsFAR), num(l.noOfEWSUnit)), unit: 'sqft', bench: ['FAR per EWS (sqft)'] },
      ],
    },
    {
      name: 'Apt Configurations',
      rows: [
        { label: 'Floor to Floor Height Apt', value: v('floorToFloorHeightApt'), unit: 'm' },
        { label: 'Average Wall Area (Interior + Exterior) Per Unit', value: v('avgWallArea'), unit: 'sq ft' },
        { label: 'No. Of Units', value: v('noOfUnits'), unit: '' },
      ],
    },
    {
      name: 'Non-Apt Efficiencies',
      rows: [
        {
          label: 'Basement parking efficiency',
          value: cars > 0 ? ((num(l.totalBasementArea) - num(l.circulationArea)) / cars / 10.7639).toFixed(2) : '-',
          unit: 'sqm/car',
        },
      ],
    },
    {
      name: 'Non-Apt Configuration',
      rows: [
        { label: 'Lobby Corridor Width', value: v('lobbyCorridorWidth'), unit: 'm' },
        { label: 'Driveway Width Basement', value: v('drivewayWidthBasement'), unit: 'm' },
        { label: 'Floor to Floor Height Ground Lobby', value: v('floorToFloorHeightGroundLobby'), unit: 'm' },
        ...(has('floorToFloorHeightBasementB1B2')
          ? [{ label: 'Floor to Floor Height Basement B1/B2', value: v('floorToFloorHeightBasementB1B2'), unit: 'm', bench: ['Floor to Floor Height Basement B1 B2'] }]
          : []),
        { label: 'Parking bay size', value: str(o.totalParkingBaySize), unit: 'sq ft', bench: ['Total Parking Bay size', 'Parking bay size'] },
        ...(has('avgWallAreaBasement') ? [{ label: 'Average Wall Area (Interior + Exterior) Per Basement', value: v('avgWallAreaBasement'), unit: 'sq ft' }] : []),
        { label: 'No. of Basements', value: v('noOfBasements'), unit: '', bench: ['No. of Basements', 'Number of Basements'] },
      ],
    },
  ]
  return groups
}

/* ------------------------------------------------------------------ 4. Additional Elements 2/2 (clusters) */
function clusterPages(ctx: Ctx, clusters: ClusterConfig[]) {
  const { doc } = ctx
  const L = 35
  const R = 806.89
  const SPLIT = L + (R - L) * 0.65
  const pct = (a: number, b: number) => (b > 0 ? `${Number(((a / b) * 100).toFixed(2))}%` : '-')
  let y = 0
  const page = () => {
    contentPage(ctx, 'Design Considerations — Additional Elements 2/2')
    y = 80
  }
  page()
  clusters.forEach((c, ci) => {
    const [A, B, Cc, D, E, F, G, Hh, I, J] = [
      c.floorFAR, c.floorBUA, c.nonFARBUA, c.floorCarpetArea, c.floorShaftArea, c.structureFootprintArea, c.nonSaleableFAR,
      c.windowOpeningArea, c.externalGlazingArea, c.wallPerimeterArea,
    ].map(num)
    const rows = [
      ['Window/Carpet', pct(Hh, D)],
      ['Glazing area/Wall perimeter', pct(I, J)],
      ['Shaft/Floor BUA', pct(E, B)],
      ['Str. Footprint/BUA', pct(F, B)],
      ['Core Area/Floor FAR', pct(G, A)],
      ['Non FAR BUA/Floor BUA', pct(Cc, B)],
    ]
    const total = 20 + 18 + rows.length * 24
    if (ci > 0 && y + total > LIMIT) page()
    doc.rect(L, y, R - L, 20).fill(NAVY)
    txt(doc, `CLUSTER LEVEL DESIGN — ${c.name || `Cluster ${ci + 1}`}`, 39, y + 6, 'B', 9, '#FFFFFF')
    y += 20
    doc.rect(L, y, R - L, 18).fill('#DCE8F5')
    doc.lineWidth(0.3).rect(L, y, R - L, 18).stroke(BORDER)
    txt(doc, 'Parameter', 39, y + 5, 'B', 8, NAVY)
    line(doc, SPLIT, y, SPLIT, y + 18, BORDER, 0.3)
    center(doc, 'Value', SPLIT, R, y + 5, 'B', 8, NAVY)
    y += 18
    rows.forEach(([label, val], i) => {
      doc.rect(L, y, R - L, 24).fill(i % 2 ? '#F0F4F8' : '#FFFFFF')
      doc.lineWidth(0.3).rect(L, y, R - L, 24).stroke(BORDER)
      txt(doc, label, 39, y + 4, 'S', 8, TEXT)
      line(doc, SPLIT, y, SPLIT, y + 24, BORDER, 0.3)
      center(doc, val, SPLIT, R, y + 4, 'S', 9, TEXT)
      y += 24
    })
    y += 8
  })
}

/* ------------------------------------------------------------------ 5. Area Ratios Comparison */
const STANDARDS: Record<string, string> = {
  carpet: '55% to 60%',
  buaSa: '1.1 to 1.2',
  buaFar: '—',
  saFar: '1.4 to 1.6',
  farUtil: '—',
  circ: '—',
  parking: '18 to 32 sqm/car',
}
const COMPARE_ROWS: [string, string][] = [
  ['carpet', 'Carpet Area / Saleable'],
  ['buaSa', 'BUA / Saleable'],
  ['buaFar', 'BUA / FAR'],
  ['saFar', 'Saleable / FAR'],
  ['farUtil', 'FAR Utilization'],
  ['circ', 'Circulation Efficiency'],
  ['parking', 'Basement Parking Efficiency (sqm/car)'],
]

function currentRatios(d: ProjectLevelDesignData) {
  const l = d.keyRatioInputs || {}
  const rows = d.additionalElements2?.rows || []
  const cell = (cat: string) => num(rows.find((r) => r.category === cat)?.bua)
  const farUtil = keyRatioFormula(27, l)
  const cars = num(l.totalNumberOfCars)
  const dash = (s: string) => (!s || s === '-' ? '—' : s)
  return {
    carpet: dash(ratio(num(l.carpetArea), num(l.saleableArea))),
    buaSa: dash(keyRatioFormula(4, l)),
    buaFar: dash(ratio(num(l.builtUpArea), num(l.far))),
    saFar: dash(keyRatioFormula(5, l)),
    farUtil: farUtil && num(l.permissibleFAR) ? `${Number(Number(farUtil).toFixed(0))}%` : '—',
    circ: cell('Circulation Area') && cell('Total') ? `${((cell('Circulation Area') / cell('Total')) * 100).toFixed(2)}%` : '—',
    parking: cars > 0 ? ((num(l.totalBasementArea) - num(l.circulationArea)) / cars / 10.7639).toFixed(2) : '—',
  } as Record<string, string>
}

function otherRatios(d: ProjectLevelDesignData) {
  const r = comparisonRatios(d)
  const clean = (s: string | undefined) => {
    if (!s || s === '-') return '—'
    return /^\d+\.\d+$/.test(s) ? String(Number(s)) : s
  }
  return {
    carpet: clean(r.carpetSaleable),
    buaSa: clean(r.buaSaleable),
    buaFar: clean(r.buaFAR),
    saFar: clean(r.saleableFAR),
    farUtil: '—',
    circ: '—',
    parking: clean(r.parkingEfficiency),
  } as Record<string, string>
}

function verdictColor(std: string, val: string) {
  if (std === '—' || val === '—') return TEXT
  const range = std.match(/([0-9]+(?:\.[0-9]+)?)\s*%?\s*(?:[-–—]|to)\s*([0-9]+(?:\.[0-9]+)?)/i)
  const n = parseFloat(val.replace(/[^0-9.]/g, ''))
  if (!range || isNaN(n)) return TEXT
  return n < parseFloat(range[1]) || n > parseFloat(range[2]) ? RED : GREEN
}

function comparisonPage(ctx: Ctx, input: DprInput, d: ProjectLevelDesignData) {
  const { doc, project } = ctx
  contentPage(ctx, 'Project Brief – Area Ratios Comparison')
  const ids = (d.compareProjectIds ?? []).map(String)
  const others = (input.compareProjects ?? []).filter((c) => !ids.length || ids.includes(String(c.id)))
  const cols = [
    { name: project.name, location: project.location, values: currentRatios(d) },
    ...others.map((c) => ({ name: c.name, location: c.location, values: otherRatios(((c.summary ?? {}) as Record<string, unknown>).projectLevelDesignData as ProjectLevelDesignData ?? {}) })),
  ]
  const L = 35
  const R = 805
  const X = [L, 125, 295, 367]
  const cw = (R - 367) / cols.length
  cols.forEach((_, i) => X.push(367 + cw * (i + 1)))
  const HEAD = '#1A3566'
  const headCells = [
    { t: 'Category', x0: X[0], x1: X[1], align: 'left' as const },
    { t: 'Parameter', x0: X[1], x1: X[2], align: 'left' as const },
    { t: 'Standard Target', x0: X[2], x1: X[3], align: 'left' as const },
    ...cols.map((c, i) => ({ t: [c.name, c.location].filter(Boolean).join(' '), x0: X[3 + i], x1: X[4 + i], align: 'center' as const })),
  ]
  const hh = Math.max(...headCells.map((c) => boxH(doc, c.t, c.x1 - c.x0 - 14, 'B', 8.5))) + 14
  let y = 75
  doc.rect(L, y, R - L, hh).fill('#DCE8F5')
  doc.lineWidth(0.3).rect(L, y, R - L, hh).stroke(BORDER)
  headCells.forEach((c, i) => {
    if (i > 0) line(doc, c.x0, y, c.x0, y + hh, BORDER, 0.3)
    box(doc, c.t, c.x0 + 7, y + 7, c.x1 - c.x0 - 14, 'B', 8.5, HEAD, c.align)
  })
  y += hh
  const rows = COMPARE_ROWS.map(([k, label]) => ({
    k,
    label,
    h: Math.max(boxH(doc, label, X[2] - X[1] - 14, 'S', 8.5), boxH(doc, STANDARDS[k], X[3] - X[2] - 14, 'S', 8.5)) + 14,
  }))
  const total = rows.reduce((s, r) => s + r.h, 0)
  doc.rect(L, y, X[1] - L, total).fill(HEAD)
  doc.lineWidth(0.3).rect(L, y, X[1] - L, total).stroke(BORDER)
  const ch = boxH(doc, 'Design Parameters', X[1] - L - 14, 'B', 8.5)
  box(doc, 'Design Parameters', L + 7, y + total / 2 - ch / 2, X[1] - L - 14, 'B', 8.5, '#FFFFFF', 'center')
  rows.forEach((r) => {
    doc.rect(X[1], y, R - X[1], r.h).fill('#F9FBFF')
    doc.lineWidth(0.3).rect(X[1], y, R - X[1], r.h).stroke(BORDER)
    box(doc, r.label, X[1] + 7, y + 7, X[2] - X[1] - 14, 'S', 8.5, TEXT)
    line(doc, X[2], y, X[2], y + r.h, BORDER, 0.3)
    box(doc, STANDARDS[r.k], X[2] + 7, y + 7, X[3] - X[2] - 14, 'S', 8.5, '#555555', 'center')
    cols.forEach((c, i) => {
      line(doc, X[3 + i], y, X[3 + i], y + r.h, BORDER, 0.3)
      const val = c.values[r.k] ?? '—'
      center(doc, val, X[3 + i], X[4 + i], y + 7, 'S', 8.5, verdictColor(STANDARDS[r.k], val))
    })
    y += r.h
  })
}

/* ------------------------------------------------------------------ module */
const projectLevel: ModuleRenderer = (ctx, input) => {
  const s = (input.summary ?? {}) as Record<string, unknown>
  const d = s.projectLevelDesignData as ProjectLevelDesignData | undefined
  if (!d || typeof d !== 'object') {
    contentPage(ctx, 'Design Considerations — Project Level Parameters')
    emptyMessage(ctx, 'No project level design data configured.')
    return
  }
  // same fall-backs as the Project Level Design page
  const pdl = (s.projectDetailsLayoutData ?? {}) as Record<string, unknown>
  const l: KeyRatioInputs = { ...(d.keyRatioInputs ?? {}) }
  if (!l.buildingHeight && pdl.towerHeight) l.buildingHeight = String(pdl.towerHeight)
  if (!l.saleableArea && pdl.grandTotalSaleable) l.saleableArea = String(pdl.grandTotalSaleable)
  const farPerm = num(input.project.far_permissible)
  if (farPerm) l.permissibleFAR = String(Math.round(farPerm * 10.7639))
  const data: ProjectLevelDesignData = { ...d, keyRatioInputs: l }
  const benchmarks = input.benchmarks

  areaStatementPage(ctx, d.areaStatementInputs ?? {})
  paramsPages(ctx, parameterRows(l, d.additionalElements2), benchmarks)
  keyRatioPages(ctx, keyRatioGroups(l, d.additionalElements2), benchmarks)
  if (d.clusterConfigs?.length) clusterPages(ctx, d.clusterConfigs)
  comparisonPage(ctx, input, data)
}
export default projectLevel
