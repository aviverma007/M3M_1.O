/*
 * Landscape & Amenities: parameter cards in two columns, then the selected amenities by category
 * (category cell spanning its amenity rows, "(cont.)" when a category continues on the next page).
 */
import { DEFAULT_AMENITIES, DEFAULT_LANDSCAPE_CONFIG } from '@/components/design-chapters-b/landscapeCatalogue'
import { C, H, W, contentPage, emptyMessage, type Ctx, type Doc } from '../doc.js'
import type { ModuleRenderer } from './index.js'

const LIMIT = H - 65
const BORDER = '#CBD5E0'

type Param = { name: string; label: string; type?: string; unit?: string }
type Category = { category: string; parameters: Param[] }
type Head = { head: string; items: string[] }

const empty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

function display(p: Param, v: unknown) {
  if (v === true || v === 'true') return 'Yes'
  if (v === false || v === 'false') return 'No'
  const s = Array.isArray(v) ? v.map(String).join('/') : String(v).trim()
  const unit = p.unit && !/^(free\s*)?text$/i.test(p.unit) ? p.unit : ''
  return unit && s ? `${s} ${unit}` : s
}

const lines = (doc: Doc, s: string, w: number) => {
  doc.font('S').fontSize(9)
  return Math.max(1, Math.round(doc.heightOfString(s || ' ', { width: w }) / doc.currentLineHeight(true)))
}

/* ------------------------------------------------------------------ parameter cards */

function parameterPages(ctx: Ctx, cards: { title: string; rows: [string, string][] }[]) {
  const { doc } = ctx
  const TITLE = 'Landscape & Amenities Parameters'
  const gap = 14
  const cw = (W - 70 - gap) / 2
  const pw = cw * 0.55
  const vw = cw - pw
  const xs = [35, 35 + cw + gap]

  const cardH = (c: (typeof cards)[number]) => 36 + c.rows.reduce((a, [l, v]) => a + Math.max(lines(doc, l, pw - 12), lines(doc, v, vw - 12)) * 12.15 + 12, 0)

  let rest = cards
  while (rest.length) {
    contentPage(ctx, TITLE)
    // split into two columns by row count (left takes cards until it holds half the rows)
    const total = rest.reduce((a, c) => a + c.rows.length, 0)
    const cols: (typeof cards)[] = [[], []]
    let acc = 0
    const ys = [80, 80]
    const placed: typeof cards = []
    for (const c of rest) {
      const col = acc < total / 2 ? 0 : 1
      const h = cardH(c)
      if (ys[col] + h > LIMIT && ys[col] > 80) {
        if (col === 0 && ys[1] + h <= LIMIT) {
          cols[1].push(c)
          ys[1] += h + 10
          placed.push(c)
          continue
        }
        break
      }
      cols[col].push(c)
      ys[col] += h + 10
      acc += c.rows.length
      placed.push(c)
    }
    if (!placed.length) placed.push(rest[0]), cols[0].push(rest[0])
    let maxY = 80
    cols.forEach((col, ci) => {
      const x = xs[ci]
      let y = 80
      for (const card of col) {
        doc.rect(x, y, cw, 20).fill(C.navy)
        doc.lineWidth(0.4).rect(x, y, cw, 20).stroke(BORDER)
        doc.font('B').fontSize(9).fillColor(C.white).text(card.title, x + 6, y + 5.5, { lineBreak: false })
        y += 20
        doc.rect(x, y, cw, 16).fill('#DCE8F5')
        doc.lineWidth(0.4).rect(x, y, cw, 16).stroke(BORDER)
        doc.font('B').fontSize(9).fillColor(C.navy).text('Parameter', x, y + 3.5, { width: pw, align: 'center', lineBreak: false })
        doc.lineWidth(0.4).moveTo(x + pw, y).lineTo(x + pw, y + 16).stroke(BORDER)
        doc.font('B').fontSize(9).fillColor(C.navy).text('Value', x + pw, y + 3.5, { width: vw, align: 'center', lineBreak: false })
        y += 16
        card.rows.forEach(([label, value], i) => {
          const h = Math.max(lines(doc, label, pw - 12), lines(doc, value, vw - 12)) * 12.15 + 12
          doc.rect(x, y, cw, h).fill(i % 2 ? '#F4F7FC' : C.white)
          doc.lineWidth(0.3).rect(x, y, cw, h).stroke(BORDER)
          doc.lineWidth(0.3).moveTo(x + pw, y).lineTo(x + pw, y + h).stroke(BORDER)
          doc.font('S').fontSize(9).fillColor(C.text).text(label, x + 6, y + 6, { width: pw - 12 })
          doc.font('S').fontSize(9).fillColor(C.text).text(value, x + pw + 6, y + 6, { width: vw - 12, align: 'center' })
          y += h
        })
        y += 10
      }
      maxY = Math.max(maxY, y)
    })
    doc.lineWidth(0.6).moveTo(W / 2, 80).lineTo(W / 2, maxY).stroke('#D0DCEA')
    rest = rest.filter((c) => !placed.includes(c))
  }
}

/* ------------------------------------------------------------------ selected amenities */

function amenityPages(ctx: Ctx, groups: { head: string; items: string[] }[]) {
  const { doc } = ctx
  const TITLE = 'Landscape & Amenities — Selected Amenities'
  const X = 35
  const TW = 771
  const CW = 180
  const AX = X + CW
  const AW = TW - CW
  let y = 0
  const page = () => {
    contentPage(ctx, TITLE)
    y = 80
    doc.rect(X, y, TW, 28).fill(C.navy)
    doc.lineWidth(0.5).rect(X, y, TW, 28).stroke(BORDER)
    doc.font('S').fontSize(9).fillColor(C.white)
    doc.text('Category', X + 8, y + 9, { lineBreak: false })
    doc.text('Amenity', AX + 8, y + 9, { lineBreak: false })
    doc.lineWidth(0.5).moveTo(AX, y + 3).lineTo(AX, y + 25).stroke(BORDER)
    y += 28
  }
  page()
  const catBlock = (label: string, top: number, bottom: number) => {
    doc.rect(X, top, CW, bottom - top).fill('#EEF2F8')
    const th = lines(doc, label, CW - 16) * 12.15
    doc.font('B').fontSize(9).fillColor(C.navy).text(label, X + 8, top + (bottom - top) / 2 - th / 2, { width: CW - 16 })
    doc.lineWidth(0.5).rect(X, top, CW, bottom - top).stroke(BORDER)
    doc.lineWidth(0.5).moveTo(X, bottom).lineTo(X + TW, bottom).stroke(BORDER)
  }
  for (const g of groups) {
    let label = g.head
    doc.font('B').fontSize(9)
    let catMin = lines(doc, label, CW - 16) * 12.15 + 10
    let top = y
    let first = true
    g.items.forEach((item, i) => {
      let h = lines(doc, item, AW - 16) * 12.15 + 12
      if (first) h = Math.max(h, catMin)
      if (y + h > LIMIT) {
        if (y > top) catBlock(label, top, y)
        else doc.lineWidth(0.5).moveTo(X, y).lineTo(X + TW, y).stroke(BORDER) // the original closes the table line again
        page()
        label = `${g.head} (cont.)`
        doc.font('B').fontSize(9)
        catMin = lines(doc, label, CW - 16) * 12.15 + 10
        top = y
        // continuation rows are not stretched to the "(cont.)" label (as the original)
        h = lines(doc, item, AW - 16) * 12.15 + 12
      }
      doc.rect(AX, y, AW, h).fill(i % 2 ? '#F0F4F8' : C.white)
      doc.font('S').fontSize(9).fillColor(C.text).text(item, AX + 8, y + 5, { width: AW - 16 })
      doc.lineWidth(0.5).moveTo(AX, y).lineTo(AX, y + h).stroke(BORDER)
      doc.lineWidth(0.5).moveTo(AX + AW, y).lineTo(AX + AW, y + h).stroke(BORDER)
      if (i < g.items.length - 1) doc.lineWidth(0.3).moveTo(AX, y + h).lineTo(AX + AW, y + h).stroke(BORDER)
      y += h
      first = false
    })
    catBlock(label, top, y)
  }
}

/* ------------------------------------------------------------------ module */

const landscape: ModuleRenderer = (ctx, input) => {
  const d = (((input.summary ?? {}) as Record<string, unknown>).landscapeAmenitiesData ?? {}) as {
    landscapeConfig?: Category[]
    amenitiesList?: Head[]
    landscapeData?: Record<string, unknown>
    selectedAmenities?: string[]
  }
  const config = d.landscapeConfig?.length ? d.landscapeConfig : (DEFAULT_LANDSCAPE_CONFIG as Category[])
  const values = d.landscapeData ?? {}
  const cards = config
    .map((c) => ({
      title: c.category,
      rows: (c.parameters ?? []).filter((p) => !empty(values[p.name])).map((p): [string, string] => [p.label, display(p, values[p.name])]),
    }))
    .filter((c) => c.rows.length)

  const heads = d.amenitiesList?.length ? d.amenitiesList : (DEFAULT_AMENITIES as Head[])
  const selected = new Set(d.selectedAmenities ?? [])
  const seen = new Set<string>()
  const groups = heads
    .map((h) => ({
      head: h.head,
      items: (h.items ?? []).filter((it) => selected.has(it) && !seen.has(it) && (seen.add(it), true)),
    }))
    .filter((g) => g.items.length)

  if (!cards.length && !groups.length) {
    contentPage(ctx, 'Landscape & Amenities Specs')
    emptyMessage(ctx, 'No landscape parameters configured.')
    return
  }
  if (cards.length) parameterPages(ctx, cards)
  if (groups.length) amenityPages(ctx, groups)
}
export default landscape
