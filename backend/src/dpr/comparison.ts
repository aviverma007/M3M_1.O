/*
 * Module 21 "Comparison" PDF: 2–5 projects side by side, in the DPR's format
 * (A4 landscape, same cover gradient, navy header/footer chrome, General Sans, same colours).
 * Rows, winners and the portfolio reference come from frontend/src/lib/projectComparison.ts, the logic the page uses.
 */
import { buildComparison, fmtNum, type CompareInput, type CompareRow, type Comparison, type RowStat } from '@/lib/projectComparison'
import { C, H, MARGIN, W, brandFor, contentPage, createDoc, fmtDate, thankYouPage, toBuffer, txt, type Ctx, type Doc } from './doc.js'

const X = MARGIN
const TW = W - MARGIN * 2
const LIMIT = H - 45
const BAND = '#1E3A5F'
const ALT = '#F0F4F8'
const BORDER = '#CBD5E0'
const GREY = '#6B7280'
/** one colour per project (navy and blue as before, then teal, amber, violet) */
export const SLOT_COLORS = ['#1A3566', '#5B8FC7', '#0E7490', '#B45309', '#7C3AED']

export type PortfolioRef = { portfolio: string; projects: number; rows: Record<string, RowStat> }

export async function buildComparisonPdf(inputs: CompareInput[], ref?: PortfolioRef, date = new Date()) {
  const cmp = buildComparison(...inputs)
  const doc = createDoc()
  const names = cmp.heads.map((h) => h.name)
  const ctx: Ctx = {
    doc,
    project: { name: names.join(' vs '), location: '', projectType: '', category: '', locationCategory: cmp.heads[0].portfolio },
    brand: brandFor(cmp.heads[0].portfolio),
    subtitle: `${names.join('  vs  ')}  |  Project Comparison`.slice(0, 160),
  }
  cover(ctx, cmp, date)
  summaryPage(ctx, cmp)
  detailPages(ctx, cmp, ref)
  thankYouPage(ctx)
  return toBuffer(doc)
}

/* ------------------------------------------------------------------ cover */
function cover(ctx: Ctx, cmp: Comparison, date: Date) {
  const { doc, brand } = ctx
  doc.addPage()
  const grad = doc.linearGradient(0, 0, W, 0)
  grad.stop(0, '#091D4A').stop(0.3, '#1A3D88').stop(0.5, '#2A55A8').stop(0.7, '#1A3D88').stop(1, '#091D4A')
  doc.rect(0, 0, W, H - 0.01).fill(grad)
  doc.lineWidth(1.2).rect(80, 128, W - 160, 355).stroke(C.frame)
  doc.rect(W / 2 - 125, 96, 250, 64).fill(C.white)
  doc.image(brand.logo, W / 2 - 125, 104, { fit: [250, 48], align: 'center' })
  txt(doc, 'Project Comparison Report', 0, 186, 'B', 32, C.white, { width: W, align: 'center' })
  const n = cmp.heads.length
  if (n === 2) {
    const cy = 296
    cmp.heads.forEach((h, i) => {
      const x = i === 0 ? 110 : W / 2 + 50
      txt(doc, h.name, x, cy - 12, 'B', 21, C.white, { width: W / 2 - 160, align: 'center', ellipsis: true })
      txt(doc, h.location, x, cy + 18, 'S', 12, C.sub, { width: W / 2 - 160, align: 'center', ellipsis: true })
    })
    doc.circle(W / 2, cy + 4, 24).fill(C.white)
    txt(doc, 'VS', W / 2 - 24, cy - 4, 'B', 15, C.navy, { width: 48, align: 'center' })
  } else {
    const cw = (W - 200) / n
    cmp.heads.forEach((h, i) => {
      const x = 100 + i * cw
      doc.circle(x + cw / 2, 262, 5).fill(SLOT_COLORS[i] === '#1A3566' ? '#FFFFFF' : SLOT_COLORS[i])
      txt(doc, h.name, x + 6, 276, 'B', n > 3 ? 13 : 16, C.white, { width: cw - 12, align: 'center', height: 18, ellipsis: true })
      txt(doc, h.location, x + 6, 300, 'S', 9.5, C.sub, { width: cw - 12, align: 'center', height: 12, ellipsis: true })
    })
  }
  txt(doc, `Management comparison of ${n} projects: design, efficiency, commercials and delivery`, 0, 385, 'S', 11, C.sub, { width: W, align: 'center' })
  doc.rect(W / 2 - 120, 465, 240, 36).fill(C.white)
  txt(doc, `Date : ${fmtDate(date)}`, 0, 477, 'S', 12, C.navy, { width: W, align: 'center' })
}

/* ------------------------------------------------------------------ summary */
function summaryPage(ctx: Ctx, cmp: Comparison) {
  const { doc } = ctx
  contentPage(ctx, 'Comparison Summary')
  const n = cmp.heads.length
  const gap = n === 2 ? 70 : 12
  const cw = (TW - gap * (n - 1)) / n
  cmp.heads.forEach((h, i) => {
    const x = X + i * (cw + gap)
    doc.roundedRect(x, 80, cw, 92, 6).fill(SLOT_COLORS[i])
    txt(doc, `PROJECT ${String.fromCharCode(65 + i)}`, x + 14, 90, 'S', 8, C.sub)
    txt(doc, h.name, x + 14, 103, 'B', n > 3 ? 13 : 17, C.white, { width: cw - 28, height: 20, ellipsis: true })
    txt(doc, h.location || '-', x + 14, 127, 'S', 9, C.white, { width: cw - 28, height: 12, ellipsis: true })
    txt(doc, [h.projectType, h.category, h.portfolio].filter(Boolean).join('  |  '), x + 14, 148, 'R', 8, C.sub, { width: cw - 28, height: 11, ellipsis: true })
  })
  if (n === 2) {
    doc.circle(W / 2, 126, 22).fill(C.white).lineWidth(1.5).circle(W / 2, 126, 22).stroke(C.frame)
    txt(doc, 'VS', W / 2 - 22, 119, 'B', 13, C.navy, { width: 44, align: 'center' })
  }

  // key figures: label column + one column per project (numbers only)
  let y = 190
  txt(doc, 'Key Figures', X, y, 'B', 12, C.text)
  y += 22
  const lw = 150
  const vw = (TW - lw) / n
  for (const k of cmp.kpis) {
    doc.rect(X, y, TW, 28).fill(ALT)
    txt(doc, k.label + (k.unit ? ` (${k.unit})` : ''), X + 10, y + 9, 'S', 8.5, C.text, { width: lw - 16 })
    k.values.forEach((v, i) => {
      const x0 = X + lw + i * vw + 8
      txt(doc, v, x0, y + 9, 'B', 9.5, SLOT_COLORS[i], { width: vw - 16, ellipsis: true })
    })
    y += 31
  }

  // scorecard
  y += 8
  const boxH = 78
  doc.roundedRect(X, y, TW, boxH, 6).fill(C.navy)
  txt(doc, 'Benchmark Scorecard', X + 18, y + 12, 'B', 12, C.white)
  txt(doc, `Rows where a better value is defined (efficiency, cost, parking, delivery): ${cmp.score.measured}`, X + 18, y + 31, 'R', 8.5, C.sub, { width: 300 })
  const lead = leader(cmp)
  txt(doc, lead, X + 18, y + 50, 'S', 9.5, C.white, { width: 300, ellipsis: true })
  const tiles = [...cmp.heads.map((h, i) => ({ label: `${short(h.name)} best`, n: cmp.score.wins[i], color: SLOT_COLORS[i] })), { label: 'All equal', n: cmp.score.tie, color: GREY }]
  const tw = Math.min(110, (TW - 340) / tiles.length - 8)
  tiles.forEach((t, i) => {
    const x = X + TW - (tiles.length - i) * (tw + 8)
    doc.roundedRect(x, y + 14, tw, 50, 5).fill(C.white)
    txt(doc, String(t.n), x, y + 18, 'B', 18, t.color, { width: tw, align: 'center' })
    txt(doc, t.label, x + 4, y + 45, 'S', 7, GREY, { width: tw - 8, align: 'center', height: 9, ellipsis: true })
  })
}
const short = (s: string) => (s.length > 11 ? s.slice(0, 10) + '…' : s)
function leader(cmp: Comparison) {
  const max = Math.max(...cmp.score.wins)
  const top = cmp.heads.filter((_, i) => cmp.score.wins[i] === max)
  if (!cmp.score.measured) return 'No benchmarked rows to compare yet.'
  return top.length > 1 ? `${top.map((h) => h.name).join(' and ')} are level with ${max} best values each.` : `${top[0].name} has the best value on ${max} of ${cmp.score.measured} benchmarked rows.`
}

/* ------------------------------------------------------------------ detail tables */
function detailPages(ctx: Ctx, cmp: Comparison, ref?: PortfolioRef) {
  const { doc } = ctx
  const n = cmp.heads.length
  const refW = ref ? 128 : 0
  const pW = n <= 2 ? 220 : n === 3 ? 190 : 170
  const vW = (TW - pW - refW) / n
  const cols = [X, ...cmp.heads.map((_, i) => X + pW + i * vW), X + pW + n * vW, X + TW]
  let y = 0
  const header = () => {
    contentPage(ctx, 'Project Comparison — Details')
    y = 80
    doc.rect(X, y, TW, 30).fill(C.navy)
    txt(doc, 'Parameter', X + 8, y + 10, 'S', 9, C.white)
    cmp.heads.forEach((h, i) => {
      doc.circle(cols[i + 1] + 11, y + 15, 3.5).fill(SLOT_COLORS[i] === '#1A3566' ? '#FFFFFF' : SLOT_COLORS[i])
      txt(doc, h.name, cols[i + 1] + 19, y + 10, 'S', 9, C.white, { width: vW - 26, ellipsis: true })
    })
    if (ref) txt(doc, `${ref.portfolio === 'All' ? 'Portfolio' : ref.portfolio} reference`, cols[n + 1] + 8, y + 10, 'S', 9, C.white, { width: refW - 14, ellipsis: true })
    for (const cx of cols.slice(1, ref ? n + 2 : n + 1)) doc.lineWidth(0.5).moveTo(cx, y + 4).lineTo(cx, y + 26).stroke(BORDER)
    y += 30
  }
  header()
  for (const sec of cmp.sections) {
    if (y + 22 + 30 > LIMIT) header()
    doc.rect(X, y, TW, 22).fill(BAND)
    txt(doc, sec.title, X + 10, y + 6, 'B', 10, C.white)
    y += 22
    if (!sec.rows.length && sec.empty) {
      doc.rect(X, y, TW, 26).fill(C.white)
      txt(doc, sec.empty, X + 10, y + 8, 'R', 8.5, C.text, { width: TW - 20, ellipsis: true })
      y += 26
    }
    sec.rows.forEach((r, i) => {
      const h = 30
      if (y + h > LIMIT) {
        header()
        doc.rect(X, y, TW, 22).fill(BAND)
        txt(doc, `${sec.title} (contd.)`, X + 10, y + 6, 'B', 10, C.white)
        y += 22
      }
      drawRow(doc, r, y, h, i % 2 === 1, cols, n, ref?.rows[r.label])
      y += h
    })
  }
  if (ref) {
    if (y + 30 > LIMIT) header()
    txt(
      doc,
      `Reference: average, best and lowest of ${ref.projects} ${ref.portfolio === 'All' ? '' : `${ref.portfolio} `}projects that have the figure (test/demo projects left out). "BEST" marks the best value among the compared projects where a better direction is defined.`,
      X,
      y + 8,
      'R',
      7.5,
      GREY,
      { width: TW },
    )
  }
}

function drawRow(doc: Doc, r: CompareRow, y: number, h: number, alt: boolean, cols: number[], n: number, stat?: RowStat) {
  const right = X + TW
  doc.rect(X, y, TW, h).fill(alt ? ALT : C.white)
  txt(doc, r.label + (r.unit ? ` (${r.unit})` : ''), X + 8, y + 10, 'S', 8.5, C.text, { width: cols[1] - X - 16, ellipsis: true })
  r.values.forEach((v, i) => {
    const x0 = cols[i + 1] + 8
    const w = cols[i + 2] - cols[i + 1] - 16
    const win = r.best.includes(i)
    const pill = win && w > 70
    txt(doc, v, x0, y + 10, win ? 'B' : 'S', 9, win ? C.green : C.text, { width: w - (pill ? 38 : 0), ellipsis: true })
    if (pill) {
      doc.roundedRect(x0 + w - 34, y + 8.5, 34, 11, 5.5).fill('#DCFCE7')
      txt(doc, 'BEST', x0 + w - 34, y + 10.6, 'B', 6, C.green, { width: 34, align: 'center' })
    }
  })
  if (cols.length > n + 2) {
    const x0 = cols[n + 1] + 8
    const w = right - cols[n + 1] - 14
    if (stat) {
      txt(doc, `avg ${fmtNum(stat.avg, stat.avg < 10 ? 2 : stat.avg < 1000 ? 1 : 0)}`, x0, y + 5, 'S', 8, C.text, { width: w, ellipsis: true })
      const bestLabel = stat.better ? 'best' : 'high'
      txt(doc, `${bestLabel} ${fmtNum(stat.best.v, 2)} · ${stat.best.name}`, x0, y + 17, 'R', 6.5, stat.better ? C.green : GREY, { width: w, ellipsis: true })
    } else txt(doc, r.nums.some((x) => x !== null) ? '—' : '', x0, y + 10, 'R', 8, GREY)
  }
  doc.lineWidth(0.5)
  for (const cx of cols.slice(0, n + 2)) doc.moveTo(cx, y).lineTo(cx, y + h).stroke(BORDER)
  doc.moveTo(right, y).lineTo(right, y + h).stroke(BORDER)
  doc.moveTo(X, y + h).lineTo(right, y + h).stroke(BORDER)
}
