/*
 * "Parameter | Details" table used by Service Design, Structure and MEP pages:
 * navy column header, dark section bands, rows with value (+ unit) and an optional "Req:" line
 * coloured green (meets benchmark) / red (deviates).
 */
import { C, H, contentPage, type Ctx, type Doc } from '../doc.js'

export const LIMIT = H - 65 // rows/bands must end above this
const X = 35
const TW = 730
const SPLIT = 335
const BORDER = '#CBD5E0'
const BAND = '#1E3A5F'
const ALT = '#F0F4F8'
const GREY = '#6B7280'

export type ParamRow = {
  label: string
  value: string
  unit?: string
  /** benchmark text shown as "Req: …" (omitted when undefined) */
  req?: string
  /** true = meets benchmark (green), false = deviates (red), undefined = neutral */
  ok?: boolean
}
export type ParamSection = { title: string; rows: ParamRow[] }

const lh = (doc: Doc, s: string, w: number, font: string, size: number) => {
  doc.font(font).fontSize(size)
  return doc.heightOfString(s || ' ', { width: w })
}

export function renderParamTable(ctx: Ctx, title: string, headers: [string, string], sections: ParamSection[]) {
  const { doc } = ctx
  let y = 0
  let idx = 0
  const page = () => {
    contentPage(ctx, title)
    y = 80
    doc.rect(X, y, TW, 32.15).fill(C.navy)
    doc.lineWidth(0.5).rect(X, y, TW, 32.15).stroke(BORDER)
    doc.font('S').fontSize(9).fillColor(C.white)
    doc.text(headers[0], X + 8, y + 7, { lineBreak: false })
    doc.text(headers[1], SPLIT + 8, y + 7, { lineBreak: false })
    doc.lineWidth(0.5).moveTo(SPLIT, y + 3).lineTo(SPLIT, y + 29.15).stroke(BORDER)
    y += 32.15
    idx = 0
  }
  page()
  for (const sec of sections) {
    if (!sec.rows.length) continue
    if (y + 22 > LIMIT) page()
    doc.rect(X, y, TW, 22).fill(BAND)
    doc.lineWidth(0.5).rect(X, y, TW, 22).stroke(BORDER)
    doc.font('B').fontSize(10).fillColor(C.white).text(sec.title, X + 10, y + 5.95, { lineBreak: false })
    y += 22
    idx = 0
    for (const r of sec.rows) {
      const labelH = lh(doc, r.label, SPLIT - X - 16, 'S', 9)
      const valueText = r.value + (r.unit ? ` ${r.unit}` : '')
      const valueH = lh(doc, valueText, X + TW - SPLIT - 16, 'S', 9)
      const h = Math.max(labelH, valueH + (r.req !== undefined ? 12.45 : 0)) + 12
      if (y + h > LIMIT) {
        page()
      }
      const color = r.ok === true ? C.green : r.ok === false ? C.red : C.text
      doc.rect(X, y, TW, h).fill(idx % 2 ? ALT : C.white)
      doc.font('S').fontSize(9).fillColor(C.text).text(r.label, X + 8, y + 4.96, { width: SPLIT - X - 16 })
      const vw = X + TW - SPLIT - 16
      if (r.unit && valueH <= 12.2) {
        doc.font('S').fontSize(9).fillColor(color).text(r.value, SPLIT + 8, y + 4.96, { lineBreak: false })
        const w = doc.widthOfString(r.value)
        doc.font('R').fontSize(9).fillColor(color).text(` ${r.unit}`, SPLIT + 8 + w, y + 4.96, { lineBreak: false })
      } else {
        doc.font('S').fontSize(9).fillColor(color).text(valueText, SPLIT + 8, y + 4.96, { width: vw })
      }
      if (r.req !== undefined) {
        doc.font('R').fontSize(7).fillColor(r.ok === false ? C.red : GREY).text(`Req: ${r.req}`, SPLIT + 8, y + 4.96 + valueH + 2.03, { width: vw })
      }
      doc.lineWidth(0.5)
      doc.moveTo(SPLIT, y).lineTo(SPLIT, y + h).stroke(BORDER)
      doc.moveTo(X, y + h).lineTo(X + TW, y + h).stroke(BORDER)
      doc.moveTo(X, y).lineTo(X, y + h).stroke(BORDER)
      doc.moveTo(X + TW, y).lineTo(X + TW, y + h).stroke(BORDER)
      y += h
      idx++
    }
  }
}

/* ------------------------------------------------------------------ value helpers */

export const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

/** booleans -> Yes/No, arrays joined, everything else trimmed string */
export function show(v: unknown): string {
  if (v === true || v === 'true') return 'Yes'
  if (v === false || v === 'false') return 'No'
  if (Array.isArray(v)) return v.map(String).join(', ')
  return String(v ?? '').trim()
}

export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/** value within [lo, hi] */
export const inRange = (v: unknown, lo: number, hi: number) => {
  const n = num(v)
  return Number.isFinite(n) ? n >= lo && n <= hi : undefined
}

/** case-insensitive equality / containment of one of the accepted values */
export const oneOf = (v: unknown, ...accepted: string[]) => {
  const s = show(v).toLowerCase()
  return accepted.some((a) => s === a.toLowerCase() || s.includes(a.toLowerCase()))
}

/** generic benchmark check for free-text benchmarks ("6.1 to 6.5", "Min 3", "Yes", option text) */
export function checkBenchmark(value: unknown, bench: string): boolean | undefined {
  const b = bench.trim()
  if (!b || isEmpty(value)) return undefined
  const range = b.match(/(-?[0-9]+(?:\.[0-9]+)?)\s*(?:to|[-–—])\s*(-?[0-9]+(?:\.[0-9]+)?)/i)
  if (range) return inRange(value, parseFloat(range[1]), parseFloat(range[2]))
  const min = b.match(/^(?:min\.?\s*)?([0-9]+(?:\.[0-9]+)?)/i)
  if (min) {
    const n = num(value)
    return Number.isFinite(n) ? n >= parseFloat(min[1]) : undefined
  }
  return oneOf(value, b)
}
