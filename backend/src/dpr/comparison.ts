/*
 * Module 21 "Comparison" PDF: two projects side by side, in the DPR's format
 * (A4 landscape, same cover gradient, navy header/footer chrome, General Sans, same colours).
 * Rows and winners come from frontend/src/lib/projectComparison.ts, the same logic the page uses.
 */
import { buildComparison, barShare, type CompareInput, type CompareRow, type Comparison } from '@/lib/projectComparison'
import { C, H, MARGIN, W, brandFor, contentPage, createDoc, fmtDate, thankYouPage, toBuffer, txt, type Ctx, type Doc } from './doc.js'

const X = MARGIN
const TW = W - MARGIN * 2
const COL = [X, X + 232, X + 232 + 192, X + 232 + 192 * 2, X + TW] // Parameter | A | B | Difference
const LIMIT = H - 45
const BAND = '#1E3A5F'
const ALT = '#F0F4F8'
const BORDER = '#CBD5E0'
const A_CLR = C.navy
const B_CLR = '#5B8FC7'
const GREY = '#6B7280'

export async function buildComparisonPdf(A: CompareInput, B: CompareInput, date = new Date()) {
  const cmp = buildComparison(A, B)
  const doc = createDoc()
  const ctx: Ctx = {
    doc,
    project: { name: `${cmp.a.name} vs ${cmp.b.name}`, location: '', projectType: '', category: '', locationCategory: cmp.a.portfolio },
    brand: brandFor(cmp.a.portfolio),
    subtitle: `${cmp.a.name}  vs  ${cmp.b.name}  |  Project Comparison`,
  }
  cover(ctx, cmp, date)
  summaryPage(ctx, cmp)
  sectionPages(ctx, cmp)
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
  txt(doc, 'Project Comparison Report', 0, 190, 'B', 34, C.white, { width: W, align: 'center' })
  // two names with a VS badge between them
  const cy = 300
  txt(doc, cmp.a.name, 110, cy - 12, 'B', 21, C.white, { width: W / 2 - 160, align: 'center', ellipsis: true })
  txt(doc, cmp.a.location, 110, cy + 18, 'S', 12, C.sub, { width: W / 2 - 160, align: 'center', ellipsis: true })
  txt(doc, cmp.b.name, W / 2 + 50, cy - 12, 'B', 21, C.white, { width: W / 2 - 160, align: 'center', ellipsis: true })
  txt(doc, cmp.b.location, W / 2 + 50, cy + 18, 'S', 12, C.sub, { width: W / 2 - 160, align: 'center', ellipsis: true })
  doc.circle(W / 2, cy + 4, 24).fill(C.white)
  txt(doc, 'VS', W / 2 - 24, cy - 4, 'B', 15, C.navy, { width: 48, align: 'center' })
  txt(doc, 'Management comparison of design, efficiency, commercials and delivery', 0, 385, 'S', 11, C.sub, { width: W, align: 'center' })
  doc.rect(W / 2 - 120, 465, 240, 36).fill(C.white)
  txt(doc, `Date : ${fmtDate(date)}`, 0, 477, 'S', 12, C.navy, { width: W, align: 'center' })
}

/* ------------------------------------------------------------------ summary */
function summaryPage(ctx: Ctx, cmp: Comparison) {
  const { doc } = ctx
  contentPage(ctx, 'Comparison Summary')
  // project cards
  const cw = (TW - 70) / 2
  const card = (x: number, p: Comparison['a'], clr: string, tag: string) => {
    doc.roundedRect(x, 80, cw, 92, 6).fill(clr)
    txt(doc, tag, x + 16, 90, 'S', 8, C.sub)
    txt(doc, p.name, x + 16, 103, 'B', 17, C.white, { width: cw - 32, ellipsis: true })
    txt(doc, p.location || '-', x + 16, 127, 'S', 9.5, C.white, { width: cw - 32, ellipsis: true })
    const meta = [p.projectType, p.category, p.portfolio, p.classification].filter(Boolean).join('  |  ')
    txt(doc, meta, x + 16, 148, 'R', 8.5, C.sub, { width: cw - 32, ellipsis: true })
  }
  card(X, cmp.a, A_CLR, 'PROJECT A')
  card(X + cw + 70, cmp.b, B_CLR, 'PROJECT B')
  doc.circle(W / 2, 126, 22).fill(C.white).lineWidth(1.5).circle(W / 2, 126, 22).stroke(C.frame)
  txt(doc, 'VS', W / 2 - 22, 119, 'B', 13, C.navy, { width: 44, align: 'center' })

  // KPI butterfly
  let y = 190
  txt(doc, 'Key Figures', X, y, 'B', 12, C.text)
  y += 22
  const mid = W / 2
  const half = 250
  for (const k of cmp.kpis) {
    const s = barShare(k.an, k.bn)
    doc.rect(X, y, TW, 30).fill(ALT)
    txt(doc, k.label + (k.unit ? ` (${k.unit})` : ''), mid - 80, y + 10, 'S', 8.5, C.text, { width: 160, align: 'center' })
    const bl = (half - 90) * s.a
    const br = (half - 90) * s.b
    doc.roundedRect(mid - 85 - bl, y + 9, Math.max(bl, 0.01), 12, 3).fill(A_CLR)
    doc.roundedRect(mid + 85, y + 9, Math.max(br, 0.01), 12, 3).fill(B_CLR)
    txt(doc, k.a, X + 8, y + 9, 'B', 10, A_CLR, { width: mid - 85 - bl - 8 - X - 8, align: 'right' })
    txt(doc, k.b, mid + 85 + br + 8, y + 9, 'B', 10, B_CLR, { width: 150, align: 'left' })
    y += 34
  }

  // scorecard
  y += 8
  doc.roundedRect(X, y, TW, 74, 6).fill(C.navy)
  txt(doc, 'Benchmark Scorecard', X + 18, y + 12, 'B', 12, C.white)
  txt(doc, `Parameters where a better value is defined (efficiency, cost, parking, delivery): ${cmp.score.measured}`, X + 18, y + 31, 'R', 8.5, C.sub)
  const sc = (x: number, label: string, n: number, clr: string) => {
    doc.roundedRect(x, y + 14, 120, 46, 5).fill(C.white)
    txt(doc, String(n), x, y + 18, 'B', 18, clr, { width: 120, align: 'center' })
    txt(doc, label, x + 6, y + 43, 'S', 7.5, GREY, { width: 108, align: 'center', ellipsis: true })
  }
  sc(X + TW - 390, `${short(cmp.a.name)} better`, cmp.score.a, A_CLR)
  sc(X + TW - 260, `${short(cmp.b.name)} better`, cmp.score.b, B_CLR)
  sc(X + TW - 130, 'Equal', cmp.score.tie, GREY)
  const lead = cmp.score.a === cmp.score.b ? 'Both projects are level on benchmarked parameters.' : `${cmp.score.a > cmp.score.b ? cmp.a.name : cmp.b.name} leads on ${Math.max(cmp.score.a, cmp.score.b)} of ${cmp.score.measured} benchmarked parameters.`
  txt(doc, lead, X + 18, y + 48, 'S', 9.5, C.white, { width: TW - 430, ellipsis: true })
}
const note0 = (r: CompareRow) => !!r.winner
const short = (s: string) => (s.length > 16 ? s.slice(0, 15) + '…' : s)

/* ------------------------------------------------------------------ section tables */
function sectionPages(ctx: Ctx, cmp: Comparison) {
  const { doc } = ctx
  let y = 0
  const header = () => {
    contentPage(ctx, 'Project Comparison — Details')
    y = 80
    doc.rect(X, y, TW, 30).fill(C.navy)
    txt(doc, 'Parameter', COL[0] + 8, y + 10, 'S', 9, C.white)
    txt(doc, cmp.a.name, COL[1] + 8, y + 10, 'S', 9, C.white, { width: COL[2] - COL[1] - 16, ellipsis: true })
    txt(doc, cmp.b.name, COL[2] + 8, y + 10, 'S', 9, C.white, { width: COL[3] - COL[2] - 16, ellipsis: true })
    txt(doc, 'Difference', COL[3] + 8, y + 10, 'S', 9, C.white)
    for (const cx of COL.slice(1, 4)) doc.lineWidth(0.5).moveTo(cx, y + 4).lineTo(cx, y + 26).stroke(BORDER)
    y += 30
  }
  header()
  for (const sec of cmp.sections) {
    if (y + 22 + 30 > LIMIT) header()
    doc.rect(X, y, TW, 22).fill(BAND)
    txt(doc, sec.title, X + 10, y + 6, 'B', 10, C.white)
    y += 22
    sec.rows.forEach((r, i) => {
      const h = 30
      if (y + h > LIMIT) {
        header()
        doc.rect(X, y, TW, 22).fill(BAND)
        txt(doc, `${sec.title} (contd.)`, X + 10, y + 6, 'B', 10, C.white)
        y += 22
      }
      drawRow(doc, r, y, h, i % 2 === 1, cmp)
      y += h
    })
  }
}

function drawRow(doc: Doc, r: CompareRow, y: number, h: number, alt: boolean, cmp: Comparison) {
  doc.rect(X, y, TW, h).fill(alt ? ALT : C.white)
  txt(doc, r.label + (r.unit ? ` (${r.unit})` : ''), COL[0] + 8, y + 10, 'S', 8.5, C.text, { width: COL[1] - COL[0] - 16, ellipsis: true })
  const s = barShare(r.an, r.bn)
  const cell = (i: 1 | 2, v: string, share: number, win: boolean, clr: string) => {
    const x0 = COL[i] + 8
    const w = COL[i + 1] - COL[i] - 16
    const hasBar = r.an !== null && r.bn !== null
    txt(doc, v, x0, y + (hasBar ? 6 : 10), win ? 'B' : 'S', 9, win ? C.green : C.text, { width: w - (win ? 46 : 0), ellipsis: true })
    if (win) {
      doc.roundedRect(x0 + w - 40, y + 5.5, 40, 11, 5.5).fill('#DCFCE7')
      txt(doc, 'BETTER', x0 + w - 40, y + 7.6, 'B', 6, C.green, { width: 40, align: 'center' })
    }
    if (hasBar) {
      doc.roundedRect(x0, y + 20, w, 4, 2).fill('#E2E8F0')
      if (share > 0) doc.roundedRect(x0, y + 20, Math.max(w * share, 3), 4, 2).fill(clr)
    }
  }
  cell(1, r.a, s.a, r.winner === 'a', A_CLR)
  cell(2, r.b, s.b, r.winner === 'b', B_CLR)
  // difference column
  const dx = COL[3] + 8
  const dw = COL[4] - COL[3] - 16
  if (r.an !== null && r.bn !== null) {
    const d = r.bn - r.an
    const sign = d > 0 ? '+' : d < 0 ? '−' : ''
    const abs = Math.abs(d).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    txt(doc, d === 0 ? 'No difference' : `${sign}${abs}${r.deltaPct !== null ? `  (${sign}${Math.abs(r.deltaPct).toFixed(1)}%)` : ''}`, dx, y + (note0(r) ? 6 : 10), 'S', 8.5, d === 0 ? GREY : C.text, { width: dw, ellipsis: true })
    const note = r.winner === 'tie' ? 'Equal' : r.winner ? `Advantage: ${short(r.winner === 'a' ? cmp.a.name : cmp.b.name)}` : ''
    if (note) txt(doc, note, dx, y + 18, 'R', 7, r.winner && r.winner !== 'tie' ? C.green : GREY, { width: dw, ellipsis: true })
  } else {
    const same = r.a !== '-' && r.a.toLowerCase() === r.b.toLowerCase()
    txt(doc, same ? 'Same' : r.a === '-' ? `Only ${short(cmp.b.name)} has data` : r.b === '-' ? `Only ${short(cmp.a.name)} has data` : 'Different', dx, y + 10, 'S', 8.5, same ? C.green : GREY, { width: dw })
  }
  doc.lineWidth(0.5)
  for (const cx of COL) doc.moveTo(cx, y).lineTo(cx, y + h).stroke(BORDER)
  doc.moveTo(X, y + h).lineTo(X + TW, y + h).stroke(BORDER)
}
