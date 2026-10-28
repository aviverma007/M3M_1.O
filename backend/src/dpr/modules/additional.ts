import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, filled, imagePages, pager, TABLE_TOP, val, type Col } from './cs-table.js'

type DetailFile = string | { name?: string; url?: string }
type Detail = { subject?: string; description?: string; files?: DetailFile[] }

const COLS: Col[] = [
  { label: 'Subject', width: 180 },
  { label: 'Description', width: 380 },
  { label: 'Attachments', width: 170 },
]
const fname = (f: DetailFile) => (typeof f === 'object' && f ? String(f.name ?? '') : String(f ?? ''))
const furl = (f: DetailFile) => (typeof f === 'object' && f ? String(f.url ?? '') : '')

const additional: ModuleRenderer = async (ctx, input, loadImage) => {
  const title = 'Additional Project Details'
  const page = pager(ctx, title)
  const rows = ((Array.isArray(input.summary?.additionalProjectDetailsData) ? input.summary!.additionalProjectDetailsData : []) as Detail[]).filter((r) =>
    filled(r.subject, r.description) || (r.files ?? []).length > 0,
  )
  page()
  if (!rows.length) return emptyMessage(ctx, 'No additional project details configured.')
  drawTable(
    ctx,
    COLS,
    rows.map((r) => [val(r.subject), val(r.description), val((r.files ?? []).map(fname).filter(Boolean).join('\n'))]),
    TABLE_TOP,
    page,
  )
  await imagePages(
    ctx,
    title,
    rows.flatMap((r) => (r.files ?? []).filter((f) => furl(f)).map((f) => ({ caption: `${val(r.subject)} — ${fname(f)}`, url: furl(f), name: fname(f) }))),
    loadImage,
  )
}
export default additional
