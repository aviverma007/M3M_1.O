/*
 * Additional Project Details — "Additional Project Development Details" table (subject, description, attached file
 * names: uploaded files as blue underlined links), then one page per attached image titled with the subject.
 */
import { contentPage, emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { cellHeight, drawHeader, INK, isEmbeddableImage, pager, RULE, TABLE_LIMIT, TABLE_X, ZEBRA, val, type Col } from './cs-table.js'

type DetailFile = string | { name?: string; url?: string }
type Detail = { subject?: string; description?: string; files?: DetailFile[] }

const COLS: Col[] = [
  { label: 'Subject', width: 180 },
  { label: 'Description', width: 350 },
  { label: 'Attached Files (Link)', width: 200 },
]
const LINK = '#1A56DB'
const FILE_LINE = 14.15
const fname = (f: DetailFile) => (typeof f === 'object' && f ? String(f.name ?? '') : String(f ?? ''))
const furl = (f: DetailFile) => (typeof f === 'object' && f ? String(f.url ?? '') : '')
const IMAGE_EXT = /\.(png|jpe?g)$/i

const additional: ModuleRenderer = async (ctx, input, loadImage) => {
  const rows = (Array.isArray(input.summary?.additionalProjectDetailsData) ? input.summary!.additionalProjectDetailsData : []) as Detail[]
  if (!rows.length) {
    pager(ctx, 'Additional Project Details')()
    return emptyMessage(ctx, 'No additional project details configured.')
  }
  const { doc } = ctx
  const page = pager(ctx, 'Additional Project Development Details')
  const total = COLS.reduce((a, c) => a + c.width, 0)
  let y = drawHeader(ctx, COLS, page())
  let k = 0
  for (const r of rows) {
    const files = (r.files ?? []).filter((f) => fname(f))
    const h =
      Math.max(cellHeight(ctx, val(r.subject), COLS[0].width), cellHeight(ctx, val(r.description), COLS[1].width), files.length ? files.length * FILE_LINE : cellHeight(ctx, '-', COLS[2].width)) + 12
    if (y + h > TABLE_LIMIT) {
      y = drawHeader(ctx, COLS, page())
      k = 0
    }
    doc.rect(TABLE_X, y, total, h).fill(k++ % 2 === 0 ? '#FFFFFF' : ZEBRA)
    let x = TABLE_X
    doc.font('S').fontSize(9).fillColor(INK).text(val(r.subject), x + 8, y + 5, { width: COLS[0].width - 16 })
    x += COLS[0].width
    doc.font('S').fontSize(9).fillColor(INK).text(val(r.description), x + 8, y + 5, { width: COLS[1].width - 16 })
    doc.lineWidth(0.5).moveTo(x, y).lineTo(x, y + h).stroke(RULE)
    x += COLS[1].width
    if (!files.length) doc.font('S').fontSize(9).fillColor(INK).text('-', x + 8, y + 5, { width: COLS[2].width - 16 })
    files.forEach((f, i) => {
      const url = furl(f)
      const fy = y + 5 + i * FILE_LINE
      if (typeof f === 'object' && f) {
        // uploaded file: blue underlined link (plain names come from the page's default rows)
        doc.font('S').fontSize(9)
        // underline width as the original measures it: the line-wrapper's fragments (split after '-' and spaces) summed
        const w = Math.round(fname(f).split(/(?<=[-\s])/).reduce((a, part) => a + doc.widthOfString(part), 0) * 1000) / 1000
        doc.lineWidth(0.5).moveTo(x + 8, fy + 10.75).lineTo(x + 8 + w, fy + 10.75).stroke(LINK)
        doc.fillColor(LINK).text(fname(f), x + 8, fy, { width: COLS[2].width - 16, ...(url ? { link: url } : {}) })
      } else doc.font('S').fontSize(9).fillColor(INK).text(fname(f), x + 8, fy, { width: COLS[2].width - 16 })
    })
    doc.lineWidth(0.5).moveTo(x, y).lineTo(x, y + h).stroke(RULE)
    doc.lineWidth(0.5).moveTo(TABLE_X, y + h).lineTo(TABLE_X + total, y + h).stroke(RULE)
    doc.moveTo(TABLE_X, y).lineTo(TABLE_X, y + h).stroke(RULE)
    doc.moveTo(TABLE_X + total, y).lineTo(TABLE_X + total, y + h).stroke(RULE)
    y += h
  }
  // one page per attached image (PNG/JPEG), titled with the detail's subject
  for (const r of rows)
    for (const f of r.files ?? []) {
      const url = furl(f)
      if (!url || !IMAGE_EXT.test(fname(f))) continue
      let buf: Buffer | null = null
      try {
        buf = await loadImage(url)
      } catch {
        buf = null
      }
      if (!isEmbeddableImage(fname(f), buf)) continue
      contentPage(ctx, val(r.subject))
      doc.image(buf!, TABLE_X, 80, { fit: [841.89 - TABLE_X * 2, 460], align: 'center', valign: 'center' })
    }
}
export default additional
