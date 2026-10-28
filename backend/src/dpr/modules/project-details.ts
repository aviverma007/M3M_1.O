/*
 * DPR — "Project Details + Layout Plans": Project Brief page (project details card, unit typology table,
 * total saleable bar, section image) and one "Project Layout — <name>" page per uploaded layout image
 * (the Site Plan Layout page also lists the selected amenities).
 */
import { contentPage, txt, wrap, textHeight, dash, W, type Ctx, type Doc } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import type { ImageLoader } from '../index.js'

export const PD = {
  accent: '#1A4F8A',
  headBg: '#EEF3FB',
  headLine: '#C5D5EA',
  thBg: '#DBE8F8',
  cellBg: '#F8FAFC',
  grid: '#CBD5E0',
  label: '#6B7280',
  value: '#111827',
  text: '#1A202C',
  altBg: '#F0F4F8',
  amenity: '#009FE3',
  navy: '#1A3566',
  divider: '#E2E8F0',
}

const X0 = 35
const TABLE_W = 516.89
const PAGE_BOTTOM = 555
const ROW_H = 24.131774

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '')) || 0)
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))

/** usable image buffer (PNG / JPEG) or null */
export async function imageFor(loadImage: ImageLoader, url: unknown): Promise<Buffer | null> {
  const u = str(url).trim()
  if (!u) return null
  try {
    const b = await loadImage(u)
    if (!b || b.length < 4) return null
    const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    const jpg = b[0] === 0xff && b[1] === 0xd8
    return png || jpg ? b : null
  } catch {
    return null
  }
}

/** light-blue section heading bar with a left accent (e.g. "Project Details") */
export function sectionHead(doc: Doc, title: string, y: number, w = TABLE_W) {
  doc.rect(X0, y, w, 24).fill(PD.headBg)
  doc.rect(X0, y, 4, 24).fill(PD.accent)
  doc.lineWidth(0.5).rect(X0, y, w, 24).stroke(PD.headLine)
  txt(doc, title, 47, y + 7, 'B', 10, PD.accent)
  return y + 24
}

/** 4-column label/value card; returns the bottom y */
export function detailsGrid(doc: Doc, items: { label: string; value: string }[], y: number, w = TABLE_W) {
  const cw = w / 4
  const rh = 27.844355
  const rows = Math.max(1, Math.ceil(items.length / 4))
  for (let r = 0; r < rows; r++) {
    const ry = y + r * rh
    items.slice(r * 4, r * 4 + 4).forEach((it, c) => {
      const cx = X0 + c * cw
      if (r % 2 === 0) doc.rect(cx, ry, cw, rh).fill(PD.cellBg)
      txt(doc, it.label, cx + 6, ry + 4, 'S', 8, PD.label, { width: cw - 12, ellipsis: true })
      txt(doc, it.value, cx + 6, ry + 14, 'B', 10, PD.value, { width: cw - 12, ellipsis: true })
    })
  }
  doc.lineWidth(0.4).rect(X0, y, w, rows * rh).stroke(PD.grid)
  return y + rows * rh
}

/** image fitted (centred) in a box */
export function fitImage(doc: Doc, img: Buffer, x: number, y: number, w: number, h: number) {
  try {
    doc.image(img, x, y, { fit: [w, h], align: 'center', valign: 'center' })
  } catch {
    /* unsupported / corrupt image: leave the box empty */
  }
}

/** right-hand framed image (top-aligned, full width, clipped to the frame) */
export function sideImage(doc: Doc, img: Buffer | null) {
  if (!img) return
  const x = 561.89
  const y = 75
  const w = 245
  const h = 485.27
  doc.save()
  doc.rect(x, y, w, h).clip()
  try {
    doc.image(img, x, y, { width: w })
  } catch {
    /* ignore */
  }
  doc.restore()
  doc.lineWidth(0.5).rect(x, y, w, h).stroke(PD.grid)
}

/* ------------------------------------------------------------------ unit typology table */

export type Col = { label: string; x: number; w: number }
export const UNIT_COLS: Col[] = [
  { label: 'Type', x: 35, w: 95 },
  { label: 'Typology', x: 130, w: 103 },
  { label: 'Unit Type', x: 233, w: 164 },
  { label: 'No. of Unit', x: 397, w: 78 },
  { label: 'Avg. Saleable Area in Sqft', x: 475, w: 76.89 },
]

/** column header row (light blue, centred labels, short separators); returns bottom y */
export function tableHeader(doc: Doc, cols: Col[], y: number, h = 28) {
  const right = cols[cols.length - 1].x + cols[cols.length - 1].w
  doc.rect(X0, y, right - X0, h).fill(PD.thBg)
  doc.lineWidth(0.5).rect(X0, y, right - X0, h).stroke(PD.headLine)
  cols.forEach((c, i) => {
    const th = textHeight(doc, c.label, c.w - 8, 'S', 8)
    wrap(doc, c.label, c.x + 4, y + (h - th) / 2, c.w - 8, 'S', 8, PD.accent, { align: 'center' })
    if (i < cols.length - 1) {
      const sx = cols[i + 1].x
      doc.lineWidth(0.5).moveTo(sx, y + 3).lineTo(sx, y + h - 3).stroke(PD.headLine)
    }
  })
  return y + h
}

type UnitRow = { type?: unknown; count?: unknown; size?: unknown; area?: unknown }
type TypeRow = { type?: unknown; typology?: unknown; units?: UnitRow[]; total?: unknown }

/**
 * Unit typology & area table. Groups (Residential / Retail / Club …) span their unit rows; a group that
 * doesn't fit continues on a new page (header repeated). Returns the bottom y.
 */
function unitTable(ctx: Ctx, rows: TypeRow[], y: number, newPage: () => number) {
  const { doc } = ctx
  const cols = UNIT_COLS
  const right = 551.89
  y = tableHeader(doc, cols, y)
  rows.forEach((g, gi) => {
    let units = arr<UnitRow>(g.units)
    if (units.length === 0) units = [{}]
    let start = 0
    while (start < units.length) {
      let fit = Math.floor((PAGE_BOTTOM - 20 - y) / ROW_H)
      if (fit < 1) {
        y = tableHeader(doc, cols, newPage())
        fit = Math.floor((PAGE_BOTTOM - 20 - y) / ROW_H)
      }
      const part = units.slice(start, start + fit)
      const gh = part.length * ROW_H
      doc.rect(X0, y, right - X0, gh).fill(gi % 2 === 0 ? '#FFFFFF' : PD.altBg)
      const mid = y + gh / 2 - 4.5
      part.forEach((u, i) => {
        const ry = y + i * ROW_H
        if (i < part.length - 1) doc.lineWidth(0.3).moveTo(233, ry + ROW_H).lineTo(right, ry + ROW_H).stroke(PD.grid)
        if (i === 0) {
          txt(doc, dash(g.type), 38, mid, 'B', 9, PD.text, { width: cols[0].w - 6 })
          wrap(doc, dash(g.typology), 133, mid, cols[1].w - 6, 'S', 9, PD.text)
          doc.lineWidth(0.4).moveTo(130, y).lineTo(130, y + gh).stroke(PD.grid)
        }
        const ty = ry + ROW_H / 2 - 4.5
        txt(doc, dash(u.type), 236, ty, 'S', 9, PD.text, { width: cols[2].w - 6, ellipsis: true })
        doc.lineWidth(0.4).moveTo(233, ry).lineTo(233, ry + ROW_H).stroke(PD.grid)
        txt(doc, dash(u.count), cols[3].x, ty, 'S', 9, PD.text, { width: cols[3].w, align: 'center' })
        doc.lineWidth(0.4).moveTo(397, ry).lineTo(397, ry + ROW_H).stroke(PD.grid)
        txt(doc, dash(u.size), cols[4].x, ty, 'S', 9, PD.text, { width: cols[4].w, align: 'center' })
        doc.lineWidth(0.4).moveTo(475, ry).lineTo(475, ry + ROW_H).stroke(PD.grid)
      })
      doc.lineWidth(0.5).rect(X0, y, right - X0, gh).stroke(PD.grid)
      y += gh
      start += part.length
    }
  })
  return y
}

/* ------------------------------------------------------------------ amenities side list */

type AmenityHead = { head?: unknown; items?: unknown }

function amenityGroups(landscape: Obj) {
  const selected = new Set(arr<string>(landscape.selectedAmenities).map(String))
  return arr<AmenityHead>(landscape.amenitiesList)
    .map((h) => ({ head: str(h.head), items: arr<string>(h.items).map(String).filter((t) => selected.has(t)) }))
    .filter((g) => g.items.length > 0)
}

/** two-column amenity list in the 220pt sidebar (heads with a blue bar, bulleted items) */
function amenitiesSidebar(doc: Doc, groups: { head: string; items: string[] }[]) {
  doc.rect(X0, 75, 220, 26).fill(PD.navy)
  txt(doc, 'Amenities', 43, 83, 'B', 9, '#FFFFFF')
  doc.lineWidth(0.5).moveTo(255, 75).lineTo(255, 555).stroke(PD.grid)
  doc.lineWidth(0.3).moveTo(145, 105).lineTo(145, 551).stroke(PD.divider)
  const colsX = [43, 147.5]
  const HEAD_W = 92
  const ITEM_W = 82
  const LIMIT = 548
  let col = 0
  let y = 106
  const nextCol = () => {
    if (col === 0) {
      col = 1
      y = 108
      return true
    }
    return false
  }
  for (const g of groups) {
    const head = g.head.toUpperCase()
    const hh = textHeight(doc, head, HEAD_W, 'B', 7)
    if (y > 106.5 && y + 4 + hh + 13 > LIMIT && !nextCol()) return
    if (y > 108.5) y += 4
    const bx = colsX[col]
    const barH = Math.min(hh, 18.9) + 3
    doc.rect(bx, y, 3, barH).fill(PD.amenity)
    wrap(doc, head, bx + 8, y + 1, HEAD_W, 'B', 7, PD.amenity)
    y += barH + 4
    for (const it of g.items) {
      const ih = textHeight(doc, it, ITEM_W, 'R', 7)
      if (y + ih > LIMIT && !nextCol()) return
      const tx = colsX[col] + 13
      doc.circle(tx - 5, y + ih / 2 + 0.05, 1.5).fill(PD.amenity)
      wrap(doc, it, tx, y, ITEM_W, 'R', 7, PD.text)
      y += ih + 4
    }
  }
}

/* ------------------------------------------------------------------ renderer */

type Layout = { name?: unknown; files?: { url?: unknown; name?: unknown }[] }

const projectDetails: ModuleRenderer = async (ctx, input, loadImage) => {
  const { doc } = ctx
  const s = obj(input.summary)
  const d = obj(s.projectDetailsLayoutData)
  const kri = obj(obj(s.projectLevelDesignData).keyRatioInputs)
  const p = input.project as Obj

  /* ---- Project Brief ---- */
  contentPage(ctx, 'Project Brief')
  const siteImg = await imageFor(loadImage, d.customFieldsImage)
  sideImage(doc, siteImg)

  const area = str(d.totalArea) || (num(p.site_area_acres) >= 0.5 ? str(p.site_area_acres) : '') || str(p.site_area)
  const height = str(d.towerHeight) || str(kri.buildingHeight)
  const items = [
    { label: 'Project Name', value: dash(p.name) },
    { label: 'Project Type', value: dash(p.projectType) },
    { label: 'Category', value: dash(p.category) },
    { label: 'Location', value: dash(p.location) },
    { label: 'Site Area (Acres)', value: dash(area) },
    { label: 'No. Of Towers', value: dash(d.noOfTowers) },
    { label: 'Building Height', value: height ? `${height} m` : '-' },
    ...arr<{ label?: unknown; value?: unknown }>(d.customFields)
      .filter((f) => str(f.label).trim() || str(f.value).trim())
      .map((f) => ({ label: dash(f.label), value: dash(f.value) })),
  ]
  let y = sectionHead(doc, 'Project Details', 75)
  y = detailsGrid(doc, items, y)

  const rows = arr<TypeRow>(d.tableRows)
  y += 22
  y = sectionHead(doc, 'Unit Typology & Area Details', y)
  const newPage = () => {
    contentPage(ctx, 'Project Brief')
    return 75
  }
  y = unitTable(ctx, rows, y, newPage)

  const grand = rows.reduce((t, r) => t + (num(r.total) || arr<UnitRow>(r.units).reduce((a, u) => a + num(u.area), 0)), 0)
  const total = grand > 0 ? grand : num(kri.saleableArea)
  if (y + 20 > PAGE_BOTTOM) y = newPage()
  doc.rect(X0, y, TABLE_W, 20).fill(PD.accent)
  txt(doc, 'Total Saleable Area', 41, y + 5.7, 'B', 8.5, '#FFFFFF')
  txt(doc, total ? `${Math.round(total * 100) / 100} Sqft` : '-', X0, y + 5, 'B', 10, '#FFFFFF', { width: TABLE_W - 6, align: 'right' })

  /* ---- layout pages ---- */
  const groups = amenityGroups(obj(s.landscapeAmenitiesData))
  for (const l of arr<Layout>(d.layouts)) {
    const name = str(l.name).trim()
    for (const f of arr<{ url?: unknown }>(l.files)) {
      const img = await imageFor(loadImage, f.url)
      if (!img) continue
      contentPage(ctx, `Project Layout — ${name}`)
      if (/site\s*plan/i.test(name) && groups.length) {
        fitImage(doc, img, 263, 75, W - 35 - 263, 480)
        amenitiesSidebar(doc, groups)
      } else fitImage(doc, img, X0, 75, W - 70, 480)
    }
  }
}

export default projectDetails
