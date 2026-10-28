/*
 * DPR (Detailed Project Report) PDF — shared page chrome and drawing helpers.
 * Layout, colours and fonts reproduce the original application's PDFKit report
 * (A4 landscape, General Sans Regular / Semibold / Bold).
 */
import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type Doc = PDFKit.PDFDocument

/* assets live in backend/assets/dpr (one level above both src/ and dist/) */
const ASSET_DIR = (() => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  for (const p of [path.join(here, '../assets/dpr'), path.join(here, '../../assets/dpr')]) if (fs.existsSync(p)) return p
  return path.join(here, '../assets/dpr')
})()
const asset = (f: string) => path.join(ASSET_DIR, f)

export const W = 841.89
export const H = 595.28
export const MARGIN = 35
export const CONTENT_W = W - MARGIN * 2
/** content area between header (62) and footer (H - 25) */
export const TOP = 75
export const BOTTOM = H - 25 - 10

export const C = {
  navy: '#1A3566',
  text: '#1A202C',
  white: '#FFFFFF',
  sub: '#A8C8E8',
  frame: '#8AB0D8',
  divider: '#E2E8F0',
  bulletSub: '#64748B',
  textSub: '#374151',
  green: '#16A34A',
  red: '#DC2626',
  muted: '#9CA3AF',
} as const

export type Brand = { name: string; logo: string; footer: string; thanks: string }

/** portfolio branding: Smartworld projects use the Smartworld logo, everything else M3M */
export function brandFor(locationCategory: unknown): Brand {
  const sw = String(locationCategory ?? '').toLowerCase().replace(/\s+/g, '') === 'smartworld'
  return sw
    ? { name: 'Smartworld', logo: asset('smartworld-logo.png'), footer: 'Smartworld Developers', thanks: 'M3M Developers' }
    : { name: 'M3M', logo: asset('m3m-logo.png'), footer: 'M3M Developers', thanks: 'M3M Developers' }
}

export type ReportProject = {
  name: string
  location: string
  projectType: string
  category: string
  locationCategory?: string
}

export type Ctx = {
  doc: Doc
  project: ReportProject
  brand: Brand
  /** "The Edition  |  SECTOR 66, GURGAON  |  residential  |  premium" */
  subtitle: string
}

export function createDoc() {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: false, bufferPages: false })
  doc.registerFont('R', asset('GeneralSans-Regular.ttf'))
  doc.registerFont('S', asset('GeneralSans-Semibold.ttf'))
  doc.registerFont('B', asset('GeneralSans-Bold.ttf'))
  return doc
}

export function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

/** text at (x, top) — no wrapping, no page breaks */
export function txt(doc: Doc, s: string, x: number, y: number, font: 'R' | 'S' | 'B', size: number, color: string, opts: PDFKit.Mixins.TextOptions = {}) {
  doc.font(font).fontSize(size).fillColor(color).text(s, x, y, { lineBreak: false, ...opts })
}

/** wrapped text inside a width; returns its height */
export function wrap(doc: Doc, s: string, x: number, y: number, width: number, font: 'R' | 'S' | 'B', size: number, color: string, opts: PDFKit.Mixins.TextOptions = {}) {
  doc.font(font).fontSize(size).fillColor(color)
  const h = doc.heightOfString(s, { width, ...opts })
  doc.text(s, x, y, { width, ...opts })
  return h
}

export function textHeight(doc: Doc, s: string, width: number, font: 'R' | 'S' | 'B', size: number, opts: PDFKit.Mixins.TextOptions = {}) {
  doc.font(font).fontSize(size)
  return doc.heightOfString(s, { width, ...opts })
}

/* ------------------------------------------------------------------ pages */

export function coverPage(ctx: Ctx, date: Date) {
  const { doc, project, brand } = ctx
  doc.addPage()
  const grad = doc.linearGradient(0, 0, W, 0)
  grad.stop(0, '#091D4A').stop(0.3, '#1A3D88').stop(0.5, '#2A55A8').stop(0.7, '#1A3D88').stop(1, '#091D4A')
  doc.rect(0, 0, W, H - 0.01).fill(grad)
  doc.lineWidth(1.2).rect(80, 128, W - 160, 355).stroke(C.frame)
  doc.rect(W / 2 - 125, 96, 250, 64).fill(C.white)
  doc.image(brand.logo, W / 2 - 125, 104, { fit: [250, 48], align: 'center' })
  txt(doc, 'Detailed Project Report', 0, 190, 'B', 38, C.white, { width: W, align: 'center' })
  txt(doc, project.name, 0, 260, 'B', 26, C.white, { width: W, align: 'center' })
  txt(doc, project.location, 0, 313, 'S', 17, C.sub, { width: W, align: 'center' })
  doc.rect(W / 2 - 120, 465, 240, 36).fill(C.white)
  txt(doc, `Date : ${fmtDate(date)}`, 0, 477, 'S', 12, C.navy, { width: W, align: 'center' })
}

export function thankYouPage(ctx: Ctx) {
  const { doc, brand } = ctx
  doc.addPage()
  const grad = doc.linearGradient(0, 0, W, H - 0.01)
  grad.stop(0, '#002855').stop(1, '#00509D')
  doc.rect(0, 0, W, H - 0.01).fill(grad)
  txt(doc, 'THANK YOU', 0, 260, 'S', 36, C.white, { width: W, align: 'center' })
  txt(doc, brand.thanks, 0, 540, 'S', 10, C.white, { width: W, align: 'center' })
}

/** content page: navy header with title + project line, logo on a slanted white panel, navy footer */
export function contentPage(ctx: Ctx, title: string) {
  const { doc, brand } = ctx
  doc.addPage()
  doc.rect(0, 0, W, 62).fill(C.navy)
  txt(doc, title, MARGIN, 13, 'S', 15, C.white)
  txt(doc, ctx.subtitle, MARGIN, 33, 'S', 7.5, C.white)
  doc.moveTo(W - 210, 0).lineTo(W - 195, 62).lineTo(W, 62).lineTo(W, 0).fill(C.white)
  doc.image(brand.logo, W - 115, 12, { fit: [80, 38], align: 'center', valign: 'center' })
  doc.rect(0, H - 25.01, W, 25).fill(C.navy)
  txt(doc, brand.footer, MARGIN, H - 17.01, 'S', 8, C.white)
  txt(doc, ctx.project.name.toUpperCase(), MARGIN, H - 17.01, 'S', 8, C.white, { width: CONTENT_W, align: 'right' })
}

/** "No … configured." message on an otherwise empty content page */
export function emptyMessage(ctx: Ctx, msg: string) {
  txt(ctx.doc, msg, 50, 100, 'S', 10, C.text)
}

function bullet(doc: Doc, cx: number, cy: number, r: number, color: string) {
  doc.circle(cx, cy, r).fill(color)
}

/** "Project Brief – Key Highlights" index page (same on every report) */
export function indexPage(ctx: Ctx) {
  const { doc } = ctx
  contentPage(ctx, 'Project Brief – Key Highlights')
  type Item = { t: string; sub?: string[] }
  const left: { head: string; items: Item[] }[] = [
    {
      head: 'Project Brief',
      items: [
        { t: 'Project highlights' },
        { t: 'Site plan' },
        { t: 'Club Amenities Layout' },
        { t: 'Unit Typology' },
        { t: 'Unit Layout' },
        { t: 'Retail Floor Plans' },
        { t: 'Area Statement: FSI statement, development statement, Saleable Area, Area ratios' },
      ],
    },
    {
      head: 'Design Considerations',
      items: [
        { t: 'Consultants' },
        {
          t: 'Design Considerations (Attached As Annexure)',
          sub: ['Entrance Lobbies', 'Parking', 'Traffic Circulations', 'Amenities location', 'Landscape', 'Unit Level Design & Elevation'],
        },
        { t: 'Approvals' },
        { t: 'Architectural, Structural, MEP design benchmarking' },
      ],
    },
  ]
  const right: { head: string; items: Item[] }[] = [
    { head: 'Product Mix', items: [{ t: 'Specification' }] },
    { head: 'Contracting Strategy', items: [] },
    { head: 'Planning', items: [{ t: 'Schedule (Preliminary)' }, { t: 'Organization Chart' }, { t: 'Constraints / Assumptions / Risks' }] },
  ]
  const colX = [MARGIN, W / 2 + 12]
  const textW = W / 2 - MARGIN - 34 - 20
  const column = (x: number, groups: typeof left) => {
    let y = 72
    groups.forEach((g) => {
      bullet(doc, x + 6, y + 7.5, 3.5, C.navy)
      txt(doc, g.head, x + 18, y, 'B', 13, C.text)
      y += 24.55
      g.items.forEach((it) => {
        bullet(doc, x + 22, y + 6.5, 2.8, C.navy)
        const h = wrap(doc, it.t, x + 34, y, textW, 'S', 11, C.text)
        y += h - 0.1 + 4.1
        ;(it.sub ?? []).forEach((s) => {
          bullet(doc, x + 44, y + 5.5, 2, C.bulletSub)
          txt(doc, s, x + 55, y, 'R', 9.5, C.textSub)
          y += 15.825
        })
      })
      y += 10
    })
  }
  column(colX[0], left)
  doc.lineWidth(0.8).moveTo(W / 2, 68).lineTo(W / 2, 555).stroke(C.divider)
  column(colX[1], right)
}

export function fmtDate(d: Date) {
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`
}

/** "-" for empty values */
export const dash = (v: unknown) => {
  if (v === undefined || v === null) return '-'
  const s = String(v).trim()
  return s === '' ? '-' : s
}
