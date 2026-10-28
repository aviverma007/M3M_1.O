/*
 * DPR — Phasing Plan. Nothing is printed when no phase is configured (as the original report).
 * With phases: a summary table ("Planning — Phasing Plan") in the Project Brief table style,
 * then one page per phase with its parameters card and phase map image.
 */
import { contentPage, txt, dash, W } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { PD, detailsGrid, fitImage, imageFor, sectionHead, tableHeader, type Col } from './project-details.js'

type Phase = Record<string, unknown>
const SQFT_PER_ACRE = 43560
const num = (v: unknown) => parseFloat(String(v ?? '')) || 0
const has = (v: unknown) => String(v ?? '').trim() !== ''

const FIELDS: { key: string; label: string }[] = [
  { key: 'siteArea', label: 'Site Area (sqft)' },
  { key: 'noOfTowers', label: 'No. of Towers' },
  { key: 'noOfUnits', label: 'No. of Units' },
  { key: 'farPermissible', label: 'FAR (Permissible)' },
  { key: 'farUtilized', label: 'FAR (Utilised)' },
  { key: 'saPerUnit', label: 'SA / Unit' },
  { key: 'farPerUnit', label: 'FAR / Unit' },
]

const COLS: Col[] = (() => {
  const labels = ['Phase', 'Site Area (Acres)', 'No. of Towers', 'No. of Units', 'FAR (Permissible)', 'FAR (Utilised)', 'SA / Unit (Sqft)', 'FAR / Unit']
  const widths = [131.89, 80, 75, 75, 80, 80, 80, 69]
  let x = 35
  return labels.map((label, i) => {
    const c = { label, x, w: widths[i] }
    x += widths[i]
    return c
  })
})()
const RIGHT = 35 + 671.89
const ROW_H = 24.131774

const phasingPlan: ModuleRenderer = async (ctx, input, loadImage) => {
  const { doc } = ctx
  const phases = (Array.isArray(input.summary?.phasingPlanData) ? (input.summary!.phasingPlanData as Phase[]) : []).filter(
    (p) => p && (has(p.name) || FIELDS.some((f) => has(p[f.key])) || has(p.mapImage)),
  )
  if (phases.length === 0) return

  /* ---- summary table ---- */
  const title = 'Planning — Phasing Plan'
  contentPage(ctx, title)
  let y = sectionHead(doc, 'Phase Summary', 75, RIGHT - 35)
  y = tableHeader(doc, COLS, y)
  const cell = (p: Phase, i: number) => {
    switch (i) {
      case 0:
        return dash(p.name)
      case 1:
        return has(p.siteArea) ? (num(p.siteArea) / SQFT_PER_ACRE).toFixed(2) : '-'
      default:
        return dash(p[['', '', 'noOfTowers', 'noOfUnits', 'farPermissible', 'farUtilized', 'saPerUnit', 'farPerUnit'][i]])
    }
  }
  const rowsOut: string[][] = phases.map((p) => COLS.map((_, i) => cell(p, i)))
  const tot = (k: string) => phases.reduce((t, p) => t + num(p[k]), 0)
  const totalRow = [
    'Total',
    tot('siteArea') ? (tot('siteArea') / SQFT_PER_ACRE).toFixed(2) : '-',
    tot('noOfTowers') ? String(tot('noOfTowers')) : '-',
    tot('noOfUnits') ? String(tot('noOfUnits')) : '-',
    '',
    tot('farUtilized') ? String(Math.round(tot('farUtilized') * 100) / 100) : '-',
    '',
    '',
  ]
  rowsOut.forEach((r, ri) => {
    if (y + ROW_H > 535) {
      contentPage(ctx, title)
      y = tableHeader(doc, COLS, 75)
    }
    doc.rect(35, y, RIGHT - 35, ROW_H).fill(ri % 2 === 0 ? '#FFFFFF' : PD.altBg)
    r.forEach((v, i) => {
      const c = COLS[i]
      const ty = y + ROW_H / 2 - 4.5
      if (i === 0) txt(doc, v, c.x + 3, ty, 'B', 9, PD.text, { width: c.w - 6, ellipsis: true })
      else txt(doc, v, c.x, ty, 'S', 9, PD.text, { width: c.w, align: 'center' })
      if (i > 0) doc.lineWidth(0.4).moveTo(c.x, y).lineTo(c.x, y + ROW_H).stroke(PD.grid)
    })
    doc.lineWidth(0.5).rect(35, y, RIGHT - 35, ROW_H).stroke(PD.grid)
    y += ROW_H
  })
  if (y + 20 > 555) {
    contentPage(ctx, title)
    y = 75
  }
  doc.rect(35, y, RIGHT - 35, 20).fill(PD.accent)
  totalRow.forEach((v, i) => {
    const c = COLS[i]
    if (i === 0) txt(doc, v, 41, y + 5.7, 'B', 8.5, '#FFFFFF')
    else if (v) txt(doc, v, c.x, y + 5.3, 'B', 9, '#FFFFFF', { width: c.w, align: 'center' })
  })

  /* ---- one page per phase ---- */
  for (const [i, p] of phases.entries()) {
    const name = String(p.name ?? '').trim() || `Phase ${i + 1}`
    contentPage(ctx, `Planning — Phasing Plan — ${name}`)
    let py = sectionHead(doc, `${name} — Parameters`, 75, W - 70)
    py = detailsGrid(
      doc,
      FIELDS.map((f) => ({ label: f.label, value: dash(p[f.key]) })),
      py,
      W - 70,
    )
    const img = await imageFor(loadImage, p.mapImage)
    if (img) {
      py += 12
      doc.lineWidth(0.5).rect(35, py, W - 70, 555 - py).stroke(PD.grid)
      fitImage(doc, img, 39, py + 4, W - 78, 555 - py - 8)
    }
  }
}

export default phasingPlan
