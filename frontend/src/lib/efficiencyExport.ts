/*
 * Downloads for the Efficiency Dashboard export dialog. The libraries are loaded only when a file is made.
 *   PDF  — A4 landscape (jsPDF + autotable)
 *   PPT  — 16:9 widescreen (pptxgenjs)
 *   XLSX — a sheet per section with the raw numbers + "How it's calculated" (xlsx)
 * All three draw the same pages as the print preview (lib/efficiencyReport).
 */
import type { EffGroup, EffRowMeta } from '@/lib/efficiency'
import type { EffProject } from '@/api/portfolio'
import { BRAND, TONE_FILL, TONE_TEXT, pdfSafe, type ReportPage } from '@/lib/efficiencyReport'

const TITLE = 'Project Design Efficiencies'
const hex = (c: string) => c.replace('#', '').toUpperCase()
const rgb = (c: string): [number, number, number] => {
  const h = c.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const pageTitle = (p: ReportPage) =>
  p.kind === 'cover'
    ? ''
    : p.kind === 'summary'
      ? 'Summary'
      : p.kind === 'method'
        ? `How it's calculated${p.part ? ` (${p.part})` : ''}`
        : `${p.group}${p.part ? ` (${p.part})` : ''}`

/* ================================================================== PDF */
export async function exportPdf(pages: ReportPage[], fileName: string) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297
  const H = 210
  const M = 12
  const stamp = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const t = (s: string) => pdfSafe(s)

  const frame = (title: string) => {
    doc.setFillColor(...rgb(BRAND.navy))
    doc.rect(0, 0, W, 14, 'F')
    doc.setFillColor(...rgb('#facc15'))
    doc.rect(0, 14, W, 0.8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(TITLE, M, 9.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(t(title), W - M, 9.2, { align: 'right' })
  }

  pages.forEach((p, i) => {
    if (i) doc.addPage()
    if (p.kind === 'cover') {
      doc.setFillColor(...rgb(BRAND.navy))
      doc.rect(0, 0, W, H, 'F')
      doc.setFillColor(...rgb(BRAND.blue))
      doc.triangle(W * 0.55, 0, W, 0, W, H * 0.75, 'F')
      doc.setFillColor(...rgb('#facc15'))
      doc.rect(M + 4, 52, 28, 1.6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      doc.text(t(p.title), M + 4, 70)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(191, 219, 254)
      doc.text(t(p.subtitle), M + 4, 80)
      let y = 100
      doc.setFontSize(10)
      for (const [k, v] of p.meta) {
        doc.setTextColor(147, 197, 253)
        doc.text(t(k.toUpperCase()), M + 4, y)
        doc.setTextColor(255, 255, 255)
        doc.text(doc.splitTextToSize(t(v), 120), M + 44, y)
        y += 8
      }
      let x = 175
      y = 100
      doc.setFontSize(9)
      for (const g of p.projects) {
        doc.setTextColor(250, 204, 21)
        doc.setFont('helvetica', 'bold')
        doc.text(t(g.portfolio.toUpperCase()), x, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(255, 255, 255)
        y += 5.5
        for (const n of g.names) {
          if (y > H - 14) {
            y = 100
            x += 55
          }
          doc.text(t(n), x, y)
          y += 5
        }
        y += 3
      }
      return
    }
    frame(pageTitle(p))
    if (p.kind === 'summary') {
      const cw = (W - 2 * M - 2 * 6) / 3
      p.cards.forEach((c, k) => {
        const x = M + (k % 3) * (cw + 6)
        const y = 22 + Math.floor(k / 3) * 34
        doc.setDrawColor(...rgb(BRAND.line))
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(x, y, cw, 30, 2, 2, 'FD')
        doc.setFillColor(...rgb(BRAND.blue))
        doc.rect(x, y, cw, 1.2, 'F')
        doc.setTextColor(...rgb(BRAND.grey))
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text(t(c.label.toUpperCase()), x + 4, y + 7)
        doc.setTextColor(...rgb(BRAND.slate))
        doc.setFontSize(20)
        doc.text(t(c.avg), x + 4, y + 17)
        const w = doc.getTextWidth(t(c.avg))
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...rgb(BRAND.grey))
        doc.text(t(`${c.unit} portfolio average`), x + 6 + w, y + 17)
        doc.text(t(`Range ${c.range}`), x + 4, y + 23)
        if (c.best) {
          doc.setTextColor(6, 95, 70)
          doc.text(t(`Best: ${c.best}`), x + 4, y + 27.5)
        }
      })
      doc.setTextColor(...rgb(BRAND.slate))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Watch list — far worse than the portfolio average', M, 99)
      autoTable(doc, {
        startY: 102,
        margin: { left: M, right: M },
        head: [['Project', 'Heading', 'Value', 'Portfolio avg']],
        body: p.watch.length
          ? p.watch.map((w) => [t(w.project), t(w.heading), t(w.value), t(w.avg)])
          : [['Nothing stands out — every project is within the normal range.', '', '', '']],
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        headStyles: { fillColor: rgb(BRAND.slate), textColor: 255 },
        columnStyles: { 2: { halign: 'right', textColor: rgb('#e11d48'), fontStyle: 'bold' }, 3: { halign: 'right' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })
    } else if (p.kind === 'table') {
      doc.setFillColor(...rgb(p.tone))
      doc.rect(M, 19, 2.2, 6, 'F')
      doc.setTextColor(...rgb(BRAND.slate))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(t(p.group), M + 4.5, 23.8)
      const head = [
        [
          { content: 'Heading', rowSpan: 2 },
          ...p.bands.map((b) => ({ content: t(b.name.toUpperCase()), colSpan: b.span })),
          { content: 'Portfolio avg', rowSpan: 2 },
        ],
        p.projects.map((n) => t(n)),
      ]
      const body = p.rows.map((r) => [
        `${t(r.label)}\n${t([r.unit, r.source].filter(Boolean).join(' · '))}`,
        ...r.cells.map((c) => t(c.text)),
        t(r.avg),
      ])
      autoTable(doc, {
        startY: 28,
        margin: { left: M, right: M },
        head: head as never,
        body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6, lineColor: rgb(BRAND.line), lineWidth: 0.15, valign: 'middle', halign: 'right' },
        headStyles: { fillColor: rgb(BRAND.blue), textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 62 },
          ...Object.fromEntries(p.projects.map((_, k) => [k + 1, { cellWidth: (W - 2 * M - 62 - 24) / p.projects.length }])),
          [p.projects.length + 1]: { cellWidth: 24 },
        },
        didParseCell: (d) => {
          const last = p.projects.length + 1
          if (d.section === 'head' && d.row.index === 1) d.cell.styles.fillColor = rgb('#e2e8f0')
          if (d.section === 'head' && d.row.index === 1) d.cell.styles.textColor = rgb(BRAND.slate)
          if (d.section === 'head' && (d.column.index === 0 || d.column.index === last)) d.cell.styles.fillColor = rgb(BRAND.slate)
          if (d.section !== 'body') return
          if (d.column.index === 0) {
            d.cell.styles.fontStyle = 'bold'
            d.cell.styles.textColor = rgb(BRAND.slate)
            return
          }
          if (d.column.index === last) {
            d.cell.styles.fillColor = rgb('#f1f5f9')
            d.cell.styles.fontStyle = 'bold'
            return
          }
          const c = p.rows[d.row.index]?.cells[d.column.index - 1]
          if (!c?.tone) return
          d.cell.styles.fillColor = rgb(TONE_FILL[c.tone] ?? '#ffffff')
          if (TONE_TEXT[c.tone]) d.cell.styles.textColor = rgb(TONE_TEXT[c.tone])
          if (c.tone === 'best' || c.tone === 'outlier') d.cell.styles.fontStyle = 'bold'
        },
        didDrawCell: (d) => {
          // the heading's unit / module line in grey and smaller
          if (d.section !== 'body' || d.column.index !== 0) return
          const r = p.rows[d.row.index]
          const sub = t([r.unit, r.source].filter(Boolean).join(' · '))
          if (!sub) return
          doc.setFillColor(...rgb(d.row.index % 2 ? '#ffffff' : '#ffffff'))
          doc.rect(d.cell.x + 0.3, d.cell.y + 0.3, d.cell.width - 0.6, d.cell.height - 0.6, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(...rgb(BRAND.slate))
          doc.text(t(r.label), d.cell.x + 1.6, d.cell.y + d.cell.height / 2 - 0.6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.3)
          doc.setTextColor(...rgb(BRAND.grey))
          doc.text(sub, d.cell.x + 1.6, d.cell.y + d.cell.height / 2 + 2.6)
        },
      })
      const y = Math.min(H - 12, ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160) + 5)
      legendPdf(doc, M, y)
    } else if (p.kind === 'method') {
      autoTable(doc, {
        startY: 20,
        margin: { left: M, right: M },
        head: [['Section', 'Heading', 'How it is calculated', 'Source module', 'Status']],
        body: p.rows.map((r) => [t(r.group), t(r.label), t(r.formula), t(r.source), t(r.status)]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: rgb(BRAND.line), lineWidth: 0.15 },
        headStyles: { fillColor: rgb(BRAND.slate), textColor: 255 },
        columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 46, fontStyle: 'bold' }, 3: { cellWidth: 40 }, 4: { cellWidth: 22 } },
      })
    }
  })

  // footers
  const n = doc.getNumberOfPages()
  for (let i = 2; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...rgb(BRAND.grey))
    doc.text(`M3M_1.O · ${TITLE} · ${stamp}`, M, H - 5)
    doc.text(`Page ${i} of ${n}`, W - M, H - 5, { align: 'right' })
  }
  doc.save(`${fileName}.pdf`)
}

function legendPdf(doc: import('jspdf').jsPDF, x: number, y: number) {
  const items: [string, string][] = [
    ['best', 'Best in portfolio'],
    ['good', 'Better than most'],
    ['bad', 'Worse than most'],
    ['outlier', 'Far worse (red text)'],
    ['entry', 'Looks like an entry mistake'],
  ]
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  for (const [k, label] of items) {
    doc.setFillColor(...rgb(TONE_FILL[k]))
    doc.rect(x, y - 2.6, 4, 3, 'F')
    doc.setTextColor(...rgb(BRAND.grey))
    doc.text(label, x + 5.2, y)
    x += doc.getTextWidth(label) + 11
  }
}

/* ================================================================== PowerPoint */
export async function exportPpt(pages: ReportPage[], fileName: string) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 in
  pptx.title = TITLE
  const W = 13.33
  const M = 0.45
  const font = 'Calibri'

  const frame = (s: import('pptxgenjs').default.Slide, title: string) => {
    s.background = { color: 'FFFFFF' }
    s.addShape('rect', { x: 0, y: 0, w: W, h: 0.55, fill: { color: hex(BRAND.navy) }, line: { color: hex(BRAND.navy) } })
    s.addShape('rect', { x: 0, y: 0.55, w: W, h: 0.04, fill: { color: 'FACC15' }, line: { color: 'FACC15' } })
    s.addText(TITLE, { x: M, y: 0.08, w: 6, h: 0.4, fontFace: font, fontSize: 14, bold: true, color: 'FFFFFF' })
    s.addText(title, { x: 6.5, y: 0.08, w: W - 6.5 - M, h: 0.4, fontFace: font, fontSize: 12, color: 'FFFFFF', align: 'right' })
  }

  for (const p of pages) {
    const s = pptx.addSlide()
    if (p.kind === 'cover') {
      s.background = { color: hex(BRAND.navy) }
      s.addShape('rtTriangle', {
        x: W * 0.55,
        y: 0,
        w: W * 0.45,
        h: 5.6,
        fill: { color: hex(BRAND.blue) },
        line: { color: hex(BRAND.blue) },
        flipH: true,
      })
      s.addShape('rect', { x: 0.7, y: 1.9, w: 1.1, h: 0.07, fill: { color: 'FACC15' }, line: { color: 'FACC15' } })
      s.addText(p.title, { x: 0.65, y: 2.05, w: 8, h: 0.9, fontFace: font, fontSize: 40, bold: true, color: 'FFFFFF' })
      s.addText(p.subtitle, { x: 0.7, y: 2.9, w: 8, h: 0.5, fontFace: font, fontSize: 16, color: 'BFDBFE' })
      s.addText(
        p.meta.flatMap(([k, v]) => [
          { text: `${k.toUpperCase()}   `, options: { color: '93C5FD', fontSize: 11, bold: true } },
          { text: v, options: { color: 'FFFFFF', fontSize: 12, breakLine: true } },
        ]),
        { x: 0.7, y: 3.7, w: 7, h: 2.6, fontFace: font, valign: 'top', paraSpaceAfter: 6 },
      )
      s.addText(
        p.projects.flatMap((g) => [
          { text: g.portfolio.toUpperCase(), options: { color: 'FACC15', bold: true, fontSize: 11, breakLine: true } },
          ...g.names.map((n) => ({ text: n, options: { color: 'FFFFFF', fontSize: 11, breakLine: true } })),
          { text: ' ', options: { fontSize: 6, breakLine: true } },
        ]),
        { x: 8.6, y: 3.6, w: 4.3, h: 3.6, fontFace: font, valign: 'top' },
      )
      continue
    }
    frame(s, pageTitle(p))
    if (p.kind === 'summary') {
      const cw = (W - 2 * M - 2 * 0.25) / 3
      p.cards.forEach((c, k) => {
        const x = M + (k % 3) * (cw + 0.25)
        const y = 0.85 + Math.floor(k / 3) * 1.45
        s.addShape('roundRect', { x, y, w: cw, h: 1.3, fill: { color: 'FFFFFF' }, line: { color: hex(BRAND.line), width: 1 }, rectRadius: 0.08 })
        s.addShape('rect', { x, y, w: cw, h: 0.05, fill: { color: hex(BRAND.blue) }, line: { color: hex(BRAND.blue) } })
        s.addText(
          [
            { text: c.label.toUpperCase(), options: { fontSize: 10, bold: true, color: hex(BRAND.grey), breakLine: true } },
            { text: c.avg, options: { fontSize: 26, bold: true, color: hex(BRAND.slate) } },
            { text: `  ${c.unit} portfolio average`, options: { fontSize: 10, color: hex(BRAND.grey), breakLine: true } },
            { text: `Range ${c.range}`, options: { fontSize: 9, color: hex(BRAND.grey), breakLine: true } },
            { text: c.best ? `Best: ${c.best}` : ' ', options: { fontSize: 9, color: '065F46' } },
          ],
          { x: x + 0.15, y: y + 0.08, w: cw - 0.3, h: 1.2, fontFace: font, valign: 'top' },
        )
      })
      s.addText('Watch list — far worse than the portfolio average', {
        x: M,
        y: 3.85,
        w: 8,
        h: 0.35,
        fontFace: font,
        fontSize: 13,
        bold: true,
        color: hex(BRAND.slate),
      })
      const head = ['Project', 'Heading', 'Value', 'Portfolio avg'].map((h) => ({
        text: h,
        options: { bold: true, color: 'FFFFFF', fill: { color: hex(BRAND.slate) } },
      }))
      const rows = p.watch.length
        ? p.watch
            .slice(0, 9)
            .map((w) => [
              { text: w.project },
              { text: w.heading },
              { text: w.value, options: { color: 'E11D48', bold: true, align: 'right' as const } },
              { text: w.avg, options: { align: 'right' as const } },
            ])
        : [[{ text: 'Nothing stands out — every project is within the normal range.' }, { text: '' }, { text: '' }, { text: '' }]]
      s.addTable([head, ...rows] as never, {
        x: M,
        y: 4.25,
        w: W - 2 * M,
        colW: [3.4, 4.6, 2.2, 2.23],
        fontFace: font,
        fontSize: 10,
        border: { type: 'solid', color: hex(BRAND.line), pt: 0.75 },
        rowH: 0.3,
      })
    } else if (p.kind === 'table') {
      s.addShape('rect', { x: M, y: 0.78, w: 0.07, h: 0.3, fill: { color: hex(p.tone) }, line: { color: hex(p.tone) } })
      s.addText(p.group, { x: M + 0.15, y: 0.72, w: 9, h: 0.42, fontFace: font, fontSize: 16, bold: true, color: hex(BRAND.slate) })
      const nP = p.projects.length
      const labelW = 3.3
      const avgW = 1.1
      const colW = (W - 2 * M - labelW - avgW) / nP
      const hdr = { bold: true, color: 'FFFFFF', align: 'center' as const, valign: 'middle' as const, fontSize: 9 }
      const band = [
        { text: 'Heading', options: { ...hdr, rowspan: 2, fill: { color: hex(BRAND.slate) }, align: 'left' as const } },
        ...p.bands.map((b) => ({ text: b.name.toUpperCase(), options: { ...hdr, colspan: b.span, fill: { color: hex(BRAND.blue) } } })),
        { text: 'Portfolio avg', options: { ...hdr, rowspan: 2, fill: { color: hex(BRAND.slate) } } },
      ]
      const names = p.projects.map((n) => ({ text: n, options: { ...hdr, color: hex(BRAND.slate), fill: { color: 'E2E8F0' } } }))
      const body = p.rows.map((r) => [
        {
          text: [
            { text: r.label, options: { bold: true, fontSize: 10, color: hex(BRAND.slate), breakLine: true } },
            { text: [r.unit, r.source].filter(Boolean).join(' · '), options: { fontSize: 7.5, color: hex(BRAND.grey) } },
          ],
        },
        ...r.cells.map((c) => ({
          text: c.text || '',
          options: {
            align: 'right' as const,
            fill: { color: hex(c.tone ? (TONE_FILL[c.tone] ?? '#FFFFFF') : '#FFFFFF') },
            color: hex(c.tone && TONE_TEXT[c.tone] ? TONE_TEXT[c.tone] : BRAND.slate),
            bold: c.tone === 'best' || c.tone === 'outlier',
          },
        })),
        { text: r.avg, options: { align: 'right' as const, bold: true, fill: { color: 'F1F5F9' } } },
      ])
      s.addTable([band, names, ...body] as never, {
        x: M,
        y: 1.22,
        w: W - 2 * M,
        colW: [labelW, ...p.projects.map(() => colW), avgW],
        fontFace: font,
        fontSize: 10,
        valign: 'middle',
        border: { type: 'solid', color: hex(BRAND.line), pt: 0.75 },
        rowH: 0.36,
      })
      // legend
      const items: [string, string][] = [
        ['best', 'Best in portfolio'],
        ['good', 'Better than most'],
        ['bad', 'Worse than most'],
        ['outlier', 'Far worse (red text)'],
        ['entry', 'Entry mistake'],
      ]
      let lx = M
      for (const [k, label] of items) {
        s.addShape('rect', { x: lx, y: 7.08, w: 0.18, h: 0.14, fill: { color: hex(TONE_FILL[k]) }, line: { color: hex(TONE_FILL[k]) } })
        s.addText(label, { x: lx + 0.22, y: 7.02, w: 1.9, h: 0.26, fontFace: font, fontSize: 9, color: hex(BRAND.grey) })
        lx += 2.1
      }
    } else if (p.kind === 'method') {
      const head = ['Section', 'Heading', 'How it is calculated', 'Source module', 'Status'].map((h) => ({
        text: h,
        options: { bold: true, color: 'FFFFFF', fill: { color: hex(BRAND.slate) } },
      }))
      const rows = p.rows.map((r) => [
        { text: r.group },
        { text: r.label, options: { bold: true } },
        { text: r.formula },
        { text: r.source },
        { text: r.status },
      ])
      s.addTable([head, ...rows] as never, {
        x: M,
        y: 0.8,
        w: W - 2 * M,
        colW: [2.2, 2.3, 5.03, 1.8, 1.1],
        fontFace: font,
        fontSize: 8.5,
        border: { type: 'solid', color: hex(BRAND.line), pt: 0.75 },
      })
    }
    s.addText(`M3M_1.O · ${TITLE}`, { x: M, y: 7.2, w: 6, h: 0.25, fontFace: font, fontSize: 8, color: hex(BRAND.grey) })
  }
  await pptx.writeFile({ fileName: `${fileName}.pptx` })
}

/* ================================================================== Excel */
export async function exportXlsx(
  data: { groups: EffGroup[]; rows: EffRowMeta[] },
  projects: EffProject[],
  groups: string[],
  fileName: string,
  hideEmpty: boolean,
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const g of data.groups.filter((x) => groups.includes(x.id))) {
    const rows = data.rows.filter((r) => r.group === g.id && (!hideEmpty || projects.some((p) => p.values[r.id] !== null)))
    if (!rows.length) continue
    const aoa: (string | number | null)[][] = [
      [g.title],
      ['Heading', 'Unit', 'Source', ...projects.map((p) => p.name)],
      ['', '', 'Portfolio →', ...projects.map((p) => p.portfolio)],
      ...rows.map((r) => [r.label, r.unit ?? '', `${r.moduleNo} ${r.module}`, ...projects.map((p) => p.values[r.id])]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 28 }, ...projects.map(() => ({ wch: 16 }))]
    XLSX.utils.book_append_sheet(wb, ws, g.title.replace(/[\\/?*[\]:]/g, '').slice(0, 31))
  }
  const method = [
    ['Section', 'Heading', 'Unit', 'How it is calculated', 'Source module', 'Status'],
    ...data.rows
      .filter((r) => groups.includes(r.group))
      .map((r) => [
        data.groups.find((g) => g.id === r.group)?.title ?? '',
        r.label,
        r.unit ?? '',
        r.formula,
        `${r.moduleNo} ${r.module}`,
        r.status === 'captured' ? 'Coming' : r.status === 'partial' ? 'Partly' : 'Not captured',
      ]),
  ]
  const ms = XLSX.utils.aoa_to_sheet(method)
  ms['!cols'] = [{ wch: 30 }, { wch: 34 }, { wch: 14 }, { wch: 90 }, { wch: 28 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ms, "How it's calculated")
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}
