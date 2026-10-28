/* Project Schedule — "Project Schedule L0" (master tasks + sub-tasks) and "Project Schedule — Phase-wise Summary". */
import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, filled, imagePages, pager, TABLE_TOP, val, type Col, type RowStyle } from './cs-table.js'

type Entry = { task?: string; duration?: string | number; start?: string; finish?: string }
type Master = Entry & { subTasks?: Entry[] }
type Section = { name?: string; start?: string; finish?: string; days?: string | number; durationMonths?: string | number; structureMonths?: string | number }
type Img = { name?: string; url?: string }

const TASK_COLS: Col[] = [
  { label: 'Task / Milestone Name', width: 250 },
  { label: 'Duration (Days)', width: 130, align: 'center' },
  { label: 'Start Date', width: 170, align: 'center' },
  { label: 'Finish Date', width: 180, align: 'center' },
]
const SECTION_COLS: Col[] = [
  { label: 'Phase / Section Name', width: 200 },
  { label: 'Start Date', width: 130, align: 'center' },
  { label: 'Finish Date', width: 130, align: 'center' },
  { label: 'Duration (Months)', width: 130, align: 'center' },
  { label: 'Structure Works (Months)', width: 140, align: 'center' },
]
const MASTER: RowStyle = { fill: '#DCE8F7', stroke: '#00509D', font: 'B', color: '#00509D' }

/** months between two dates (one decimal), used when the summary row has no stored duration */
function months(s: Section) {
  if (filled(s.durationMonths)) return val(s.durationMonths)
  if (!s.start || !s.finish) return '-'
  const d = (new Date(s.finish).getTime() - new Date(s.start).getTime()) / 86400000
  return d >= 0 ? (d / 30).toFixed(1) : '-'
}

const schedule: ModuleRenderer = async (ctx, input, loadImage) => {
  const d = (input.summary?.projectScheduleData ?? {}) as { schedules?: Master[]; sections?: Section[]; uploadedImages?: Img[]; uploadedFile?: Img }
  const masters = (d.schedules ?? []).filter((m) => filled(m.task))
  const sections = (d.sections ?? []).filter((s) => filled(s.start, s.finish, s.structureMonths))
  const images = d.uploadedImages ?? (d.uploadedFile ? [d.uploadedFile] : [])

  if (!masters.length) {
    pager(ctx, 'Project Schedule')()
    emptyMessage(ctx, 'No preliminary schedule tasks configured.')
  } else {
    const rows: string[][] = []
    const styles: RowStyle[] = []
    masters.forEach((m) => {
      const subs = (m.subTasks ?? []).filter((s) => filled(s.task))
      rows.push([val(m.task), val(m.duration), val(m.start), val(m.finish)])
      styles.push(subs.length ? MASTER : {})
      subs.forEach((s) => {
        rows.push([`  — ${val(s.task)}`, val(s.duration), val(s.start), val(s.finish)])
        styles.push({})
      })
    })
    const page = pager(ctx, 'Project Schedule L0')
    drawTable(ctx, TASK_COLS, rows, page(), page, (i) => styles[i])
  }
  if (sections.length) {
    const page = pager(ctx, 'Project Schedule — Phase-wise Summary')
    drawTable(
      ctx,
      SECTION_COLS,
      sections.map((s) => [val(s.name), val(s.start), val(s.finish), months(s), val(s.structureMonths)]),
      page(),
      page,
    )
  }
  await imagePages(
    ctx,
    'Project Schedule',
    images.filter((i) => i?.url).map((i) => ({ caption: val(i.name), url: String(i.url), name: String(i.name ?? '') })),
    loadImage,
  )
}
void TABLE_TOP
export default schedule
