/* DPR — Unit Level Design: one page per typology (parameter table, key plan, typology plan) + FAR & Area summary. */
import { contentPage, txt, W, type Ctx, type Doc } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import type { ImageLoader } from '../index.js'
import type { Typology } from '@/types/chapters-a'
import { calcValue, efficiencies } from '@/lib/unitLevelCalc'

const num = (v: unknown) => parseFloat(String(v ?? '')) || 0
const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== ''
const str = (v: unknown) => String(v ?? '').trim()

type Row = { label: string; value: string; unit?: string; hi?: boolean }

function typologyRows(t: Typology): Row[] {
  const bf = num(t.balconyAreaFar)
  const bnf = num(t.balconyAreaNonFar)
  const hasBal = has(t.balconyAreaFar) || has(t.balconyAreaNonFar)
  const eff = efficiencies(t)
  const e = (k: string) => (eff[k] && eff[k] !== '--' ? eff[k] : '')
  const rows: Row[] = [
    { label: 'Type / Configuration', value: str(t.type), hi: true },
    { label: 'No. of Units', value: str(t.noOfUnits) },
    { label: 'Unit Saleable Area', value: str(t.saleableArea), unit: 'Sqft', hi: true },
    { label: 'Unit Covered Area', value: str(t.coveredArea), unit: 'Sqft', hi: true },
    { label: 'Unit FAR (exc. Balcony)', value: str(t.unitFar), unit: 'Sqft' },
    { label: 'RERA Carpet Area', value: str(t.carpetArea), unit: 'Sqft' },
    { label: 'Balcony Area — FAR', value: str(t.balconyAreaFar), unit: 'Sqft' },
    { label: 'Balcony Area — Non-FAR', value: str(t.balconyAreaNonFar), unit: 'Sqft' },
    { label: 'Total Balcony Area', value: hasBal ? String(bf + bnf) : '', unit: 'Sqft', hi: true },
    {
      label: 'Unit Area — Covered + Balcony',
      value: has(t.coveredArea) || hasBal ? String(num(t.coveredArea) + bf + bnf) : '',
      unit: 'Sqft',
    },
    { label: 'Core Area (Non Saleable FAR)', value: str(t.circulationFar), unit: 'Sqft' },
    { label: 'Balcony FAR + Unit FAR', value: has(t.unitFar) || has(t.balconyAreaFar) ? String(num(t.unitFar) + bf) : '', unit: 'Sqft' },
    { label: 'Wall area (Unit external wall Area)', value: str(t.wallArea), unit: 'Sqft' },
    { label: 'AC Area', value: str(t.acArea), unit: 'Sqft' },
    { label: 'Core Area (Non Saleable FAR)', value: str(t.coreArea), unit: 'Sqft' },
    { label: 'Units Per Core', value: str(t.unitsPerCore) },
    { label: 'CA / SA', value: e('CA/SA') },
    { label: 'Balcony / SA', value: e('Balcony/SA') },
    { label: 'Core Area Efficiency', value: e('Core Area Efficiency') },
    { label: 'Unit Area (Covered + Balcony) to Saleable', value: e('Unit Area (Covered + Balcony) to Saleable') },
  ]
  return rows.filter((r) => r.value !== '')
}

async function image(doc: Doc, loadImage: ImageLoader, url: unknown, x: number, y: number, w: number, h: number) {
  if (!has(url)) return
  let buf: Buffer | null = null
  try {
    buf = await loadImage(String(url))
  } catch {
    buf = null
  }
  if (!buf || buf.length < 4) return
  const png = buf[0] === 0x89 && buf[1] === 0x50
  const jpg = buf[0] === 0xff && buf[1] === 0xd8
  if (!png && !jpg) return
  try {
    doc.image(buf, x, y, { fit: [w, h], align: 'center', valign: 'center' })
  } catch {
    /* unreadable image: skip */
  }
}

const TX = 35

async function typologyPage(ctx: Ctx, t: Typology, loadImage: ImageLoader) {
  const { doc } = ctx
  contentPage(ctx, `Unit Level Design — ${str(t.name) || 'Type'} Details`)
  // without any plan image the table spans the page (taller rows), as in the original
  const wide = !has(t.plan) && !has(t.keyPlan)
  const TW = wide ? 770 : 370
  const SPLIT = wide ? 420 : 249
  const RH = wide ? 18.125 : 13.125
  const ty = (RH - 10.125) / 2
  // header
  doc.rect(TX, 80, TW, 20).fill('#1A3566')
  doc.lineWidth(0.5).rect(TX, 80, TW, 20).stroke('#CBD5E0')
  txt(doc, 'Parameter', TX + 6, 85, 'S', 8, '#FFFFFF')
  txt(doc, 'Specification', SPLIT + 6, 85, 'S', 8, '#FFFFFF')
  doc.lineWidth(0.5).moveTo(SPLIT, 83).lineTo(SPLIT, 97).stroke('#CBD5E0')
  let y = 100
  const rows = typologyRows(t)
  rows.forEach((r, i) => {
    const fill = r.hi ? '#FEF3C7' : i % 2 === 1 ? '#F0F4F8' : '#FFFFFF'
    const color = r.hi ? '#92400E' : '#1A202C'
    doc.rect(TX, y, TW, RH).fill(fill)
    txt(doc, r.label, TX + 6, y + ty, 'S', 7.5, color)
    if (r.unit && r.hi) txt(doc, `${r.value} ${r.unit}`, SPLIT + 6, y + ty, 'S', 7.5, color)
    else {
      txt(doc, r.value, SPLIT + 6, y + ty, 'S', 7.5, color)
      if (r.unit) {
        const w = doc.font('S').fontSize(7.5).widthOfString(r.value)
        txt(doc, ` ${r.unit}`, SPLIT + 6 + w, y + ty, 'R', 7.5, color)
      }
    }
    const line = r.hi ? '#FCD34D' : '#CBD5E0'
    doc.lineWidth(0.5)
    doc.moveTo(SPLIT, y).lineTo(SPLIT, y + RH).stroke(line)
    doc.moveTo(TX + TW, y).lineTo(TX + TW, y + RH).stroke(line)
    doc.moveTo(TX, y).lineTo(TX, y + RH).stroke(line)
    doc.moveTo(TX, y).lineTo(TX + TW, y).stroke(line)
    y += RH
  })
  doc.lineWidth(0.5).moveTo(TX, y).lineTo(TX + TW, y).stroke('#CBD5E0')
  if (wide) return
  // key plan under the table, typology plan on the right
  if (has(t.keyPlan)) {
    txt(doc, 'Key Plan', TX, y + 4, 'R', 6.5, '#64748B', { width: TW, align: 'center' })
    const kTop = y + 15
    if (kTop < 520) await image(doc, loadImage, t.keyPlan, TX, kTop, TW, 538 - kTop)
  }
  if (has(t.plan)) {
    const px = 417
    const pw = W - 35 - px
    txt(doc, 'Typology Plan', px, 80, 'R', 6.5, '#64748B', { width: pw, align: 'center' })
    await image(doc, loadImage, t.plan, px, 92, pw, 444.9)
  }
}

/* ------------------------------------------------------------ summary */
const GROUPS: { title: string; rows: { label: string; key: string; eff?: boolean }[] }[] = [
  {
    title: 'FAR UTILIZATION',
    rows: [
      { label: 'Unit FAR (exc. Balcony)', key: 'Unit FAR (exc. Balcony)' },
      { label: 'Balcony Area (FAR)', key: 'Balcony Area (FAR)' },
      { label: 'Core Area (Non Saleable FAR)', key: 'Core Area (Non Saleable FAR)' },
      { label: 'Balcony FAR + Unit Far', key: 'Balcony FAR + Unit Far' },
    ],
  },
  {
    title: 'AREA',
    rows: [
      { label: 'Unit Covered Area', key: 'Unit Covered Area' },
      { label: 'Balcony Area (FAR + Non-FAR)', key: 'Balcony Area (FAR + Non-FAR)' },
      { label: 'Total Unit Area (Covered + Balcony)', key: 'Total Unit Area (Covered + Balcony)' },
      { label: 'Wall Area', key: 'Wall Area' },
      { label: 'AC Area', key: 'AC Area' },
    ],
  },
  {
    title: 'UNIT EFFICIENCIES',
    rows: [
      { label: 'CA/SA', key: 'CA/SA', eff: true },
      { label: 'Balcony/SA', key: 'Balcony/SA', eff: true },
      { label: 'Core Area Efficiency', key: 'Core Area Efficiency', eff: true },
      { label: 'Unit Area (Covered + Balcony) to Saleable', key: 'Unit Area (Covered + Balcony) to Saleable', eff: true },
    ],
  },
]
const PER_PAGE = 9
/** rows whose empty value the original prints as a red dash (the others grey) */
const RED_WHEN_EMPTY = new Set(['Balcony Area (FAR)', 'Unit Covered Area', 'Balcony Area (FAR + Non-FAR)', 'Total Unit Area (Covered + Balcony)', 'Balcony/SA'])

function summaryPage(ctx: Ctx, types: Typology[]) {
  const { doc } = ctx
  contentPage(ctx, 'Calculations (FAR & Area) — Summary')
  const x0 = 35
  const right = W - 35
  const tw = right - x0
  const labelW = 210
  const colW = (tw - labelW) / types.length
  const colX = (i: number) => x0 + labelW + i * colW
  // header
  let y = 80
  doc.rect(x0, y, tw, 22).fill('#00509D')
  doc.lineWidth(0.5).moveTo(x0 + labelW, y).lineTo(x0 + labelW, y + 22).stroke() // no colour set, as in the original
  txt(doc, 'UNIT TYPE NAME', x0 + 8, y + 7.5, 'S', 7, '#FFFFFF')
  types.forEach((t, i) => {
    txt(doc, str(t.name) || '-', colX(i), y + 7.5, 'S', 7, '#FFFFFF', { width: colW, align: 'center' })
    if (i < types.length - 1) doc.lineWidth(0.5).moveTo(colX(i + 1), y).lineTo(colX(i + 1), y + 22).stroke()
  })
  y += 22
  const effs = types.map((t) => efficiencies(t))
  for (const g of GROUPS) {
    doc.rect(x0, y, tw, 14).fill('#F0F5FF')
    doc.rect(x0, y, 3, 14).fill('#00509D')
    doc.lineWidth(0.3).moveTo(x0, y + 14).lineTo(right, y + 14).stroke('#C7D8F0')
    txt(doc, g.title, x0 + 10, y + 3.5, 'S', 7, '#00509D')
    y += 14
    g.rows.forEach((r, ri) => {
      doc.rect(x0, y, tw, 18).fill(ri % 2 ? '#F8FAFC' : '#FFFFFF')
      doc.lineWidth(0.3).moveTo(x0, y + 18).lineTo(right, y + 18).stroke('#E5E7EB')
      txt(doc, r.label, x0 + 8, y + 5.5, 'R', 7, '#1A202C')
      doc.lineWidth(0.4).moveTo(x0 + labelW, y).lineTo(x0 + labelW, y + 18).stroke('#E5E7EB')
      types.forEach((t, i) => {
        const raw = r.eff ? effs[i][r.key] : calcValue(t, r.key)
        const empty = !raw || raw === '--'
        const dashColor = RED_WHEN_EMPTY.has(r.key) ? '#DC2626' : '#64748B'
        txt(doc, empty ? '—' : raw, colX(i), y + 5.5, 'S', 7, empty ? dashColor : '#1A202C', { width: colW, align: 'center' })
        if (i < types.length - 1) doc.lineWidth(0.3).moveTo(colX(i + 1), y).lineTo(colX(i + 1), y + 18).stroke('#E5E7EB')
      })
      y += 18
    })
  }
}

const unitLevel: ModuleRenderer = async (ctx, input, loadImage) => {
  const data = input.summary?.unitLevelDesignData
  const types = (Array.isArray(data) ? data : []) as Typology[]
  if (types.length === 0) {
    contentPage(ctx, 'Design Considerations — Unit Level Design')
    txt(ctx.doc, 'No unit level design parameters configured.', 50, 100, 'S', 12, '#1A202C')
    return
  }
  for (const t of types) await typologyPage(ctx, t, loadImage)
  for (let i = 0; i < types.length; i += PER_PAGE) summaryPage(ctx, types.slice(i, i + PER_PAGE))
}
export default unitLevel
