/*
 * DPR — "Product Mix" specification chapters:
 *   ID Specifications (Apartment Design catalogue, module 2) -> room-column tables per chapter + "Kitchen Goods" page
 *   Common Area       (Common Design catalogue, module 3)    -> room-column tables with "Req:" benchmark lines
 * Data: summary.idSpecificationsData / summary.commonAreaData, keyed `${chapterId}_${roomId}`
 * (ID Specifications also stores `__hidden: string[]`). Columns follow the stored key order,
 * rows the order in which fields first appear; empty rows/columns are left out.
 */
import { contentPage, emptyMessage, txt, wrap, textHeight, W, MARGIN, type Ctx, type Doc } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { ID_SPECS_CONFIG, COMMON_AREA_CONFIG } from '@/components/design-chapters/specsConfig'
import { categoryKey, findSpecField, matchesBenchmark } from '@/components/design-chapters/specsBenchmark'
import type { SpecsConfig } from '@/components/design-chapters/specsTypes'
import type { ModuleChapter, SpecValue } from '@/types/chapters-a'

const RIGHT = W - MARGIN
const TABLE_W = RIGHT - MARGIN
/** a row that would end below this y moves to the next page */
const LIMIT = 530.28
const START_Y = 80
const PAD = 6
const LINE = '#CBD5E0'
const COL = {
  bar: '#1A3566',
  head: '#DCE8F5',
  headText: '#1A3566',
  text: '#1A202C',
  empty: '#64748B',
  stripe: '#F0F4F8',
  red: '#DC2626',
  green: '#16A34A',
}

/* ------------------------------------------------------------------ labels */
const LABELS: Record<string, string> = {
  type: 'Type', finish: 'Finish', size: 'Size', thickness: 'Thickness', skirting: 'Skirting', wearResistance: 'Wear Resistance',
  typeOfPaint: 'Type Of Paint', thicknessOfPlaster: 'Plaster Thickness', typeOfPlaster: 'Type Of Plaster',
  verticalDistanceTile: 'Vertical Tile Height', plasterFalseCeiling: 'Plaster (False Ceiling)', colorOfPaint: 'Color Of Paint',
  dooropening: 'Door Opening', typeofrebate: 'Type Of Rebate', shuttertype: 'Shutter Type', fireratingfinish: 'Fire Rating Finish',
  framefinish: 'Frame Finish', architrave: 'Architrave', accessories: 'Accessories', typeofwardrobe: 'Type Of Wardrobe',
  frametype: 'Frame Type', windowheight: 'Window Height', glasstype: 'Glass Type', railingtype: 'Railing Type', glasswidth: 'Glass Width',
  parapettype: 'Parapet Type', washingmachinearea: 'Washing Machine Area', typeofhob: 'Type Of Hob', sizeofhob: 'Size Of Hob',
  typeofchimney: 'Type Of Chimney', sizeofchimney: 'Size Of Chimney', typeofcabinetry: 'Type Of Cabinetry', typeofsink: 'Type Of Sink',
  materialofsink: 'Material Of Sink', faucettype: 'Faucet Type', provisionofmicrowave: 'Provision Of Microwave',
  provisionofoven: 'Provision Of Oven', provisionofdishwasher: 'Provision Of Dishwasher', instantgeyser: 'Instant Geyser',
  provisionofro: 'Provision Of RO', exhaustfansize: 'Exhaust Fan Size', provisionofwashingmachine: 'Provision Of Washing Machine',
  provisionofrefrigerator: 'Provision Of Refrigerator', typeofswitch: 'Type Of Switch', switches: 'Switches',
  otherprovisions: 'Other Provisions', motionsensor: 'Motion Sensor', provisionforhvac: 'Provision For HVAC',
  systemavailability: 'System Availability', counterledge: 'Counter / Ledge', fixtures: 'Fixtures', accessorieslist: 'Accessories',
  exhaustfan: 'Exhaust Fan', geyser: 'Geyser', showerpartition: 'Shower Partition', additional: 'Additional',
  flooringTreatment: 'Flooring Treatment', columnGuard: 'Column Guard', enteranceDesign: 'Enterance Design',
  typeOfFalseCeiling: 'Type Of False Ceiling', doorcoating: 'Door Coating', aircurtain: 'Air Curtain',
  doorshutterfinish: 'Door Shutter Finish', asperfirenorms: 'As Per Fire Norms', typeofac: 'Type Of AC', facilities: 'Facilities',
  services: 'Services',
}
export const labelOf = (k: string) =>
  LABELS[k] ??
  k
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

export const ID_SECTION: Record<string, string> = {
  flooring: 'Flooring', wall: 'Wall', ceiling: 'Ceiling', doors: 'Doors', 'kitchen-goods': 'Kitchen Goods', electricals: 'Electricals',
  'bathroom-accessories': 'Bathroom Accessories',
}
export const CA_SECTION: Record<string, string> = { flooring: 'Flooring', wall: 'Wall', ceiling: 'Ceiling', 'doors-other': 'Doors & Other Facilities' }

/* ------------------------------------------------------------------ data model */
type Entry = Record<string, SpecValue | undefined>
const hasValue = (v: unknown) => (Array.isArray(v) ? v.some((x) => String(x ?? '').trim() !== '') : v !== undefined && v !== null && String(v).trim() !== '')
const show = (v: unknown) => (Array.isArray(v) ? v.filter((x) => String(x ?? '').trim() !== '').join(', ') : String(v ?? '').trim())

type Column = { id: string; name: string; entry: Entry }
type Cell = { text: string; color: string; req?: { text: string; color: string } }
/** idx = position in the full (unfiltered) key list — the original stripes rows by it, counting rows it doesn't print */
type TableRow = { label: string; cells: Cell[]; idx: number }

function columnsOf(cfg: SpecsConfig, data: Record<string, unknown>, chapter: string, hidden: Set<string>): Column[] {
  const rooms = cfg.rooms(chapter)
  const cols: Column[] = []
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(`${chapter}_`) || hidden.has(k) || !v || typeof v !== 'object' || Array.isArray(v)) continue
    const entry = v as Entry
    if (!Object.values(entry).some(hasValue)) continue
    const id = k.slice(chapter.length + 1)
    const name = (rooms.find((r) => r.id === id)?.name ?? id).replace(/\s*\(parking area\)/i, '')
    cols.push({ id, name, entry })
  }
  return cols
}

/** union of field keys (first-appearance order) that have a value in at least one column, with their position in the full list */
function rowKeys(cols: Column[]) {
  const keys: string[] = []
  cols.forEach((c) => Object.keys(c.entry).forEach((k) => keys.includes(k) || keys.push(k)))
  return keys.map((key, idx) => ({ key, idx })).filter(({ key }) => cols.some((c) => hasValue(c.entry[key])))
}

function buildRows(
  cfg: SpecsConfig,
  chapter: string,
  cols: Column[],
  bench?: { chapters: ModuleChapter[]; category: string },
): TableRow[] {
  return rowKeys(cols).map(({ key, idx }) => ({
    idx,
    label: labelOf(key),
    cells: cols.map((c): Cell => {
      const v = c.entry[key]
      if (!hasValue(v)) return { text: '-', color: COL.empty }
      const text = show(v)
      if (text.toUpperCase() === 'NA') return { text, color: COL.empty }
      if (!bench) return { text, color: COL.text }
      const f = findSpecField(cfg, bench.chapters, chapter, c.id, key)
      const active = ((f as unknown as Record<string, unknown> | null)?.[categoryKey(bench.category)] as string[] | undefined) ?? []
      const list = active.filter((x) => String(x ?? '').trim() !== '')
      if (!list.length) return { text, color: COL.text }
      const ok = matchesBenchmark(v, list) === true
      return { text, color: ok ? COL.text : COL.red, req: { text: `Req: ${list.join(', ')}`, color: ok ? COL.green : COL.red } }
    }),
  }))
}

/* ------------------------------------------------------------------ drawing */
const vline = (doc: Doc, x: number, y1: number, y2: number, lw: number) => doc.lineWidth(lw).moveTo(x, y1).lineTo(x, y2).stroke(LINE)

type Layout = { labelW: number; colW: number; xs: number[] }
const layoutOf = (labelW: number, n: number): Layout => {
  const colW = (TABLE_W - labelW) / n
  return { labelW, colW, xs: Array.from({ length: n }, (_, i) => MARGIN + labelW + i * colW) }
}

function sectionBar(doc: Doc, title: string, y: number) {
  doc.rect(MARGIN, y, TABLE_W, 22).fill(COL.bar)
  txt(doc, title, MARGIN + 10, y + 7, 'B', 9, '#FFFFFF')
  return y + 22
}

function headerHeight(doc: Doc, cols: Column[], lay: Layout) {
  const inner = lay.colW - PAD * 2
  const hs = cols.map((c) => textHeight(doc, c.name, inner, 'B', 7.5))
  return Math.max(textHeight(doc, 'Specification', lay.labelW - PAD * 2, 'B', 7.5), ...hs)
}

function header(doc: Doc, cols: Column[], lay: Layout, y: number) {
  const maxH = headerHeight(doc, cols, lay)
  const h = maxH + 14
  doc.rect(MARGIN, y, TABLE_W, h).fill(COL.head)
  doc.lineWidth(0.4).rect(MARGIN, y, TABLE_W, h).stroke(LINE)
  wrap(doc, 'Specification', MARGIN + PAD, y + PAD, lay.labelW - PAD * 2, 'B', 7.5, COL.headText)
  const inner = lay.colW - PAD * 2
  cols.forEach((c, i) => {
    vline(doc, lay.xs[i], y, y + h, 0.4)
    const th = textHeight(doc, c.name, inner, 'B', 7.5)
    wrap(doc, c.name, lay.xs[i] + PAD, y + PAD + (maxH - th) / 2, inner, 'B', 7.5, COL.headText, { align: 'center' })
  })
  return y + h
}

function cellHeight(doc: Doc, c: Cell, inner: number) {
  let h = textHeight(doc, c.text, inner, 'R', 7.5)
  if (c.req) h += 3 + textHeight(doc, c.req.text, inner, 'S', 6)
  return h
}

function rowHeight(doc: Doc, r: TableRow, lay: Layout) {
  const inner = lay.colW - PAD * 2
  const hs = r.cells.map((c) => cellHeight(doc, c, inner))
  return Math.max(30, Math.max(textHeight(doc, r.label, lay.labelW - PAD * 2, 'S', 7.5), ...hs) + 14)
}

function row(doc: Doc, r: TableRow, lay: Layout, y: number, h: number, stripe: boolean) {
  doc.rect(MARGIN, y, TABLE_W, h).fill(stripe ? COL.stripe : '#FFFFFF')
  doc.lineWidth(0.3).rect(MARGIN, y, TABLE_W, h).stroke(LINE)
  wrap(doc, r.label, MARGIN + PAD, y + PAD, lay.labelW - PAD * 2, 'S', 7.5, COL.text)
  const inner = lay.colW - PAD * 2
  r.cells.forEach((c, i) => {
    vline(doc, lay.xs[i], y, y + h, 0.3)
    const th = wrap(doc, c.text, lay.xs[i] + PAD, y + PAD, inner, 'R', 7.5, c.color, { align: 'center' })
    if (c.req) wrap(doc, c.req.text, lay.xs[i] + PAD, y + PAD + th + 3, inner, 'S', 6, c.req.color, { align: 'center' })
  })
}

type Section = { title: string; cols: Column[]; rows: TableRow[] }

/** label column: fits the widest row label (or the "Specification" heading) across the whole module, +16, rounded up */
function labelWidth(doc: Doc, sections: Section[]) {
  doc.font('B').fontSize(7.5)
  let w = doc.widthOfString('Specification')
  doc.font('S').fontSize(7.5)
  for (const s of sections) for (const r of s.rows) w = Math.max(w, doc.widthOfString(r.label))
  return Math.min(Math.ceil(w + 16), 200)
}

/** room-column tables, flowing over as many pages as needed ("(cont.)" + repeated header) */
function drawSections(ctx: Ctx, pageTitle: string, sections: Section[]) {
  const { doc } = ctx
  const labelW = labelWidth(doc, sections)
  contentPage(ctx, pageTitle)
  let y = START_Y
  sections.forEach((s, si) => {
    const lay = layoutOf(labelW, s.cols.length)
    const headH = headerHeight(doc, s.cols, lay) + 14
    if (si > 0) y += 8
    if (y + 22 + headH > LIMIT) {
      contentPage(ctx, pageTitle)
      y = START_Y
    }
    y = header(doc, s.cols, lay, sectionBar(doc, s.title, y))
    s.rows.forEach((r) => {
      const h = rowHeight(doc, r, lay)
      if (y + h > LIMIT) {
        contentPage(ctx, pageTitle)
        y = header(doc, s.cols, lay, sectionBar(doc, `${s.title} (cont.)`, START_Y))
      }
      row(doc, r, lay, y, h, r.idx % 2 === 1)
      y += h
    })
    doc.lineWidth(0.6).moveTo(MARGIN, y).lineTo(RIGHT, y).stroke(LINE)
  })
}

/* ------------------------------------------------------------------ kitchen goods (ID Specifications) */
function kitchenGoods(ctx: Ctx, cols: Column[]) {
  const { doc } = ctx
  const title = 'Product Mix — Kitchen Goods'
  const VX = 325
  const VW = RIGHT - 10 - VX
  const LW = 315 - 10 - (MARGIN + 10)
  /** item names are shown with every word capitalised ("Exhaust Fan") */
  const caps = (n: string) => n.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const head = (y: number) => {
    doc.rect(MARGIN, y, TABLE_W, 26).fill(COL.bar)
    txt(doc, 'Specification', MARGIN + 10, y + 7, 'S', 9, '#FFFFFF')
    txt(doc, 'Details', VX, y + 7, 'S', 9, '#FFFFFF')
    return y + 26
  }
  /** follow-on pages: "(cont.)" title, no column header */
  const nextPage = () => {
    contentPage(ctx, `${title} (cont.)`)
    return START_Y
  }
  contentPage(ctx, title)
  let y = head(START_Y)
  for (const c of cols) {
    const keys = Object.keys(c.entry).filter((k) => hasValue(c.entry[k]))
    if (!keys.length) continue
    const firstH = Math.max(textHeight(doc, labelOf(keys[0]), LW, 'S', 8.5), textHeight(doc, show(c.entry[keys[0]]), VW, 'R', 8.5)) + 12
    if (y + 22 + firstH > LIMIT) y = nextPage()
    const group = (name: string) => {
      doc.rect(MARGIN, y, TABLE_W, 22).fill('#DCE6F0')
      doc.lineWidth(0.4).rect(MARGIN, y, TABLE_W, 22).stroke(LINE)
      txt(doc, name, MARGIN + 10, y + 6, 'B', 9, COL.headText)
      y += 22
    }
    const name = caps(c.name)
    group(name)
    keys.forEach((k, i) => {
      const label = labelOf(k)
      const val = show(c.entry[k])
      const h = Math.max(textHeight(doc, label, LW, 'S', 8.5), textHeight(doc, val, VW, 'R', 8.5)) + 12
      if (y + h > LIMIT) {
        y = nextPage()
        group(`${name} (cont.)`)
      }
      doc.rect(MARGIN, y, TABLE_W, h).fill(i % 2 ? '#F5F7FA' : '#FFFFFF')
      doc.lineWidth(0.3).rect(MARGIN, y, TABLE_W, h).stroke(LINE)
      vline(doc, 315, y, y + h, 0.3)
      wrap(doc, label, MARGIN + 10, y + 6, LW, 'S', 8.5, COL.text)
      wrap(doc, val, VX, y + 6, VW, 'R', 8.5, '#1A1A2E')
      y += h
    })
  }
}

/* ------------------------------------------------------------------ renderers */
function specData(input: Parameters<ModuleRenderer>[1], key: string) {
  const d = input.summary?.[key]
  return d && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : {}
}

export const idSpecifications: ModuleRenderer = (ctx, input) => {
  const cfg = ID_SPECS_CONFIG
  const data = specData(input, cfg.dataKey)
  const hidden = new Set(Array.isArray(data.__hidden) ? (data.__hidden as string[]) : [])
  const sections: Section[] = []
  for (const ch of cfg.chapters) {
    if (ch.id === 'kitchen-goods') continue
    const cols = columnsOf(cfg, data, ch.id, hidden)
    const rows = buildRows(cfg, ch.id, cols)
    if (cols.length && rows.length) sections.push({ title: ID_SECTION[ch.id] ?? ch.name, cols, rows })
  }
  const kitchen = columnsOf(cfg, data, 'kitchen-goods', hidden)
  if (!sections.length && !kitchen.length) {
    contentPage(ctx, 'Product Mix — ID Specifications')
    emptyMessage(ctx, 'No ID specifications configured.')
    return
  }
  if (sections.length) drawSections(ctx, 'Product Mix — ID Specifications Details', sections)
  if (kitchen.length) kitchenGoods(ctx, kitchen)
}

export const commonArea: ModuleRenderer = (ctx, input) => {
  const cfg = COMMON_AREA_CONFIG
  const data = specData(input, cfg.dataKey)
  const chapters = (input.moduleChapters?.[cfg.moduleId] ?? []) as ModuleChapter[]
  const bench = { chapters, category: String(input.project.category ?? '') }
  const sections: Section[] = []
  for (const ch of cfg.chapters) {
    const cols = columnsOf(cfg, data, ch.id, new Set())
    const rows = buildRows(cfg, ch.id, cols, bench)
    if (cols.length && rows.length) sections.push({ title: CA_SECTION[ch.id] ?? ch.name, cols, rows })
  }
  if (!sections.length) {
    contentPage(ctx, 'Product Mix — Common Area Specs')
    emptyMessage(ctx, 'No Common Area specifications configured.')
    return
  }
  drawSections(ctx, 'Product Mix — Common Area Specifications', sections)
}
