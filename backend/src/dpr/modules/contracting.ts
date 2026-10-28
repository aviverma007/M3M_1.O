/*
 * Contracting Strategy — "Packages & Elements" (packages with their elements) and "Proposed Contractors"
 * (contractor repository grouped by grade). Nothing to show -> a blank page, exactly as the original prints.
 */
import { contentPage, type Ctx } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { INK, NAVY, RULE, TABLE_LIMIT, ZEBRA, filled, val } from './cs-table.js'

type Contractor = { name?: string; grade?: string; benchmark?: string; previous?: string; remarks?: string }
type Element = { name?: string; type?: string; numberOfContractors?: string; typeOfContractors?: string; remarks?: string }
type Pkg = { name?: string; contractType?: string; elements?: Element[] }

const PLACEHOLDER = /^Element \d+$/i
const X0 = 35
const TOP = 80
const PAD = 8
const GROUP_FILL = '#EEF2F8'

type GCol = { label: string; width: number }
/** two group columns (merged cells) followed by per-row columns */
type Group = { cells: string[]; rows: string[][] }

function textH(ctx: Ctx, s: string, width: number, font: 'S' | 'B' = 'S') {
  ctx.doc.font(font).fontSize(9)
  return ctx.doc.heightOfString(s, { width: width - PAD * 2 })
}

function header(ctx: Ctx, cols: GCol[], y: number) {
  const { doc } = ctx
  const total = cols.reduce((a, c) => a + c.width, 0)
  const h = Math.max(28, Math.max(...cols.map((c) => textH(ctx, c.label, c.width))) + 14)
  doc.rect(X0, y, total, h).fill(NAVY)
  doc.lineWidth(0.5).rect(X0, y, total, h).stroke(RULE)
  let x = X0
  cols.forEach((c, i) => {
    doc.font('S').fontSize(9).fillColor('#FFFFFF').text(c.label, x + PAD, y + 7, { width: c.width - PAD * 2 })
    if (i > 0) doc.lineWidth(0.5).moveTo(x, y + 3).lineTo(x, y + h - 3).stroke(RULE)
    x += c.width
  })
  return y + h
}

/**
 * Grouped table: the first `nGroup` columns are merged per group (bold, light fill, text vertically centred),
 * the remaining columns are zebra rows (zebra restarts per group). Groups split across pages when needed.
 */
function groupedTable(ctx: Ctx, title: string, cols: GCol[], nGroup: number, groups: Group[]) {
  const { doc } = ctx
  const total = cols.reduce((a, c) => a + c.width, 0)
  const right = X0 + total
  const gx = [X0]
  cols.forEach((c, i) => gx.push(gx[i] + c.width))
  const rowX = gx[nGroup]
  const newPage = () => {
    contentPage(ctx, title)
    return header(ctx, cols, TOP)
  }
  let y = newPage()
  const closeGroup = (g: Group, y0: number, y1: number) => {
    for (let i = 0; i < nGroup; i++) {
      const w = cols[i].width
      doc.rect(gx[i], y0, w, y1 - y0).fill(GROUP_FILL)
      const s = g.cells[i] ?? '-'
      const th = textH(ctx, s, w, 'B')
      doc.font('B').fontSize(9).fillColor(NAVY).text(s, gx[i] + PAD, y0 + (y1 - y0 - th) / 2, { width: w - PAD * 2 })
      doc.lineWidth(0.5).rect(gx[i], y0, w, y1 - y0).stroke(RULE)
    }
    doc.lineWidth(0.5).moveTo(X0, y1).lineTo(right, y1).stroke(RULE)
  }
  for (const g of groups) {
    let y0 = y
    g.rows.forEach((r, ri) => {
      const h = Math.max(...cols.slice(nGroup).map((c, ci) => textH(ctx, r[ci] ?? '-', c.width))) + 12
      if (y + h > TABLE_LIMIT && y > y0) {
        closeGroup(g, y0, y)
        y = newPage()
        y0 = y
      }
      doc.rect(rowX, y, right - rowX, h).fill(ri % 2 === 0 ? '#FFFFFF' : ZEBRA)
      cols.slice(nGroup).forEach((c, ci) => {
        const x = gx[nGroup + ci]
        doc.font('S').fontSize(9).fillColor(INK).text(r[ci] ?? '-', x + PAD, y + 5, { width: c.width - PAD * 2 })
        doc.lineWidth(0.5).moveTo(x, y).lineTo(x, y + h).stroke(RULE)
      })
      doc.lineWidth(0.5).moveTo(right, y).lineTo(right, y + h).stroke(RULE)
      if (ri < g.rows.length - 1) doc.lineWidth(0.3).moveTo(rowX, y + h).lineTo(right, y + h).stroke(RULE)
      y += h
    })
    closeGroup(g, y0, y)
  }
}

const PKG_COLS: GCol[] = [
  { label: 'Package Name', width: 130 },
  { label: 'Contract Type', width: 110 },
  { label: 'Element Name', width: 170 },
  { label: 'No. of Contractors', width: 95 },
  { label: 'Remarks', width: 196 },
]
const CONTRACTOR_COLS: GCol[] = [
  { label: 'Grade', width: 90 },
  { label: 'Contractor Name', width: 150 },
  { label: 'Benchmark Projects', width: 200 },
  { label: 'Previous M3M Projects', width: 180 },
  { label: 'Remarks', width: 112 },
]

/** package contract type: the first element's type (the page edits it per element), else the package's own value */
export const packageContractType = (p: Pkg) => (p.elements ?? []).find((e) => e.type)?.type || p.contractType || ''

const contracting: ModuleRenderer = (ctx, input) => {
  const d = input.summary?.contractingStrategyData as { contractors?: Contractor[]; packages?: Pkg[] } | undefined
  const packages = (d?.packages ?? [])
    .map((p) => ({ ...p, elements: (p.elements ?? []).filter((e) => e.name && !PLACEHOLDER.test(e.name.trim())) }))
    .filter((p) => p.elements.length)
  const contractors = (d?.contractors ?? []).filter((c) => filled(c.name, c.benchmark, c.previous, c.remarks))

  if (!packages.length && !contractors.length) {
    ctx.doc.addPage() // the original prints an empty page here
    return
  }
  if (packages.length)
    groupedTable(
      ctx,
      'Contracting Strategy — Packages & Elements',
      PKG_COLS,
      2,
      packages.map((p) => ({
        cells: [val(p.name), val(packageContractType(p))],
        rows: p.elements.map((e) => [val(e.name), val(e.numberOfContractors), val(e.remarks)]),
      })),
    )
  if (contractors.length) {
    const grades: string[] = []
    contractors.forEach((c) => {
      const g = val(c.grade)
      if (!grades.includes(g)) grades.push(g)
    })
    groupedTable(
      ctx,
      'Contracting Strategy — Proposed Contractors',
      CONTRACTOR_COLS,
      1,
      grades.map((g) => ({
        cells: [g],
        rows: contractors.filter((c) => val(c.grade) === g).map((c) => [val(c.name), val(c.benchmark), val(c.previous), val(c.remarks)]),
      })),
    )
  }
}
export default contracting
