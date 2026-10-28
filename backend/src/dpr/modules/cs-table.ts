/*
 * Shared table for the "list" chapters (Consultant / Contracting / Schedule / Approvals / Additional details):
 * navy header row, zebra rows (white / #F0F4F8), Semibold 9pt, #CBD5E0 0.5pt rules — the original
 * Consultants Strategy table. Paginates with the header repeated on each new page.
 */
import { contentPage, txt, type Ctx } from '../doc.js'

export const RULE = '#CBD5E0'
export const ZEBRA = '#F0F4F8'
export const NAVY = '#1A3566'
export const INK = '#1A202C'
export const TABLE_X = 35
export const TABLE_TOP = 80
/** rows that would end below this go to a new page */
export const TABLE_LIMIT = 540

export type Col = { label: string; width: number; align?: 'left' | 'center' }
export type RowStyle = { fill?: string; stroke?: string; font?: 'R' | 'S' | 'B'; color?: string; indent?: number[] }

const PAD = 8

export function cellHeight(ctx: Ctx, s: string, width: number, font: 'R' | 'S' | 'B' = 'S') {
  ctx.doc.font(font).fontSize(9)
  return ctx.doc.heightOfString(s, { width: width - PAD * 2 })
}

export function drawHeader(ctx: Ctx, cols: Col[], y: number) {
  const { doc } = ctx
  const total = cols.reduce((a, c) => a + c.width, 0)
  const h = Math.max(...cols.map((c) => cellHeight(ctx, c.label, c.width))) + 20
  doc.rect(TABLE_X, y, total, h).fill(NAVY)
  doc.lineWidth(0.5).rect(TABLE_X, y, total, h).stroke(RULE)
  let x = TABLE_X
  cols.forEach((c, i) => {
    doc.font('S').fontSize(9).fillColor('#FFFFFF').text(c.label, x + PAD, y + 7, { width: c.width - PAD * 2, align: c.align ?? 'left' })
    if (i > 0) doc.lineWidth(0.5).moveTo(x, y + 3).lineTo(x, y + h - 3).stroke(RULE)
    x += c.width
  })
  return y + h
}

/**
 * Draw a table starting at `y` (header included). `newPage` starts a continuation page and returns its top y.
 * Returns the y below the table.
 */
export function drawTable(
  ctx: Ctx,
  cols: Col[],
  rows: string[][],
  y: number,
  newPage: () => number,
  style: (i: number) => RowStyle = () => ({}),
) {
  const { doc } = ctx
  const total = cols.reduce((a, c) => a + c.width, 0)
  y = drawHeader(ctx, cols, y)
  let k = 0 // zebra index (every row counts, styled rows included) restarts on each page
  rows.forEach((r, i) => {
    const st = style(i)
    const font = st.font ?? 'S'
    const indent = (ci: number) => st.indent?.[ci] ?? 0
    const h = Math.max(...cols.map((c, ci) => cellHeight(ctx, r[ci] ?? '-', c.width - indent(ci), font))) + 12
    if (y + h > TABLE_LIMIT) {
      y = drawHeader(ctx, cols, newPage())
      k = 0
    }
    const zebra = k++ % 2 === 0 ? '#FFFFFF' : ZEBRA
    doc.rect(TABLE_X, y, total, h).fill(st.fill ?? zebra)
    if (st.stroke) doc.lineWidth(0.5).rect(TABLE_X, y, total, h).stroke(st.stroke)
    let x = TABLE_X
    cols.forEach((c, ci) => {
      doc.font(font).fontSize(9).fillColor(st.color ?? INK).text(r[ci] ?? '-', x + PAD + indent(ci), y + 5, { width: c.width - PAD * 2 - indent(ci), align: c.align ?? 'left' })
      if (ci > 0) doc.lineWidth(0.5).moveTo(x, y).lineTo(x, y + h).stroke(RULE)
      x += c.width
    })
    doc.lineWidth(0.5).moveTo(TABLE_X, y + h).lineTo(TABLE_X + total, y + h).stroke(RULE)
    doc.moveTo(TABLE_X, y).lineTo(TABLE_X, y + h).stroke(RULE)
    doc.moveTo(TABLE_X + total, y).lineTo(TABLE_X + total, y + h).stroke(RULE)
    y += h
  })
  return y
}

/** section caption above a table (Bold 11 navy) */
export function caption(ctx: Ctx, s: string, y: number) {
  txt(ctx.doc, s, TABLE_X, y, 'B', 11, NAVY)
  return y + 20
}

/** page factory for a titled chapter */
export function pager(ctx: Ctx, title: string) {
  return () => {
    contentPage(ctx, title)
    return TABLE_TOP
  }
}

/** value as entered ('-' when empty) */
export const val = (v: unknown) => {
  if (v === undefined || v === null) return '-'
  const s = String(v)
  return s.trim() === '' ? '-' : s
}

export const filled = (...v: unknown[]) => v.some((x) => x !== undefined && x !== null && String(x).trim() !== '')

/** image file types PDFKit can embed */
export const isEmbeddableImage = (name: string, buf: Buffer | null) => {
  if (!buf || buf.length < 4) return false
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  const jpg = buf[0] === 0xff && buf[1] === 0xd8
  void name
  return png || jpg
}

/** start a caption + table at `y`; moves to a new page first when not even the header and one row fit */
export function flowTable(ctx: Ctx, title: string | null, cols: Col[], rows: string[][], y: number, newPage: () => number, style?: (i: number) => RowStyle) {
  if (!rows.length) return y
  const need = (title ? 20 : 0) + 32.15 + 24.15
  if (y + need > TABLE_LIMIT) y = newPage()
  if (title) y = caption(ctx, title, y)
  return drawTable(ctx, cols, rows, y, newPage, style) + 18
}

/** one attachment per page: caption + image fitted in the content area (PNG/JPEG only; others skipped) */
export async function imagePages(
  ctx: Ctx,
  title: string,
  items: { caption: string; url: string; name: string }[],
  loadImage: (url: string) => Promise<Buffer | null>,
) {
  for (const it of items) {
    let buf: Buffer | null = null
    try {
      buf = it.url ? await loadImage(it.url) : null
    } catch {
      buf = null
    }
    if (!isEmbeddableImage(it.name, buf)) continue
    contentPage(ctx, title)
    caption(ctx, it.caption, TABLE_TOP)
    const box = { x: TABLE_X, y: TABLE_TOP + 22, w: 841.89 - TABLE_X * 2, h: TABLE_LIMIT + 15 - (TABLE_TOP + 22) }
    ctx.doc.lineWidth(0.5).rect(box.x, box.y, box.w, box.h).stroke(RULE)
    ctx.doc.image(buf!, box.x + 6, box.y + 6, { fit: [box.w - 12, box.h - 12], align: 'center', valign: 'center' })
  }
}
