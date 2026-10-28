import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { filled, flowTable, imagePages, pager, TABLE_TOP, val, type Col } from './cs-table.js'
import { daysBetween, formatDuration } from '@/components/design-chapters-b/scheduleUtils'

type Entry = { task?: string; duration?: string; start?: string; finish?: string }
type Master = Entry & { subTasks?: Entry[] }
type Section = { name?: string; start?: string; finish?: string; days?: string | number; durationMonths?: string; structureMonths?: string }
type Img = { name?: string; url?: string }

const TASK_COLS: Col[] = [
  { label: 'Task', width: 370 },
  { label: 'Duration (Days)', width: 120 },
  { label: 'Start Date', width: 120 },
  { label: 'Finish Date', width: 120 },
]
const SECTION_COLS: Col[] = [
  { label: 'S.No', width: 50 },
  { label: 'Section', width: 160 },
  { label: 'Start Date (PCC)', width: 110 },
  { label: 'No. Of Days', width: 90 },
  { label: 'Finish Date', width: 110 },
  { label: 'Project Duration (Months)', width: 105 },
  { label: 'Structure Works (Months)', width: 105 },
]

const duration = (e: Entry) => val(formatDuration(e.duration || daysBetween(e.start, e.finish)))

const schedule: ModuleRenderer = async (ctx, input, loadImage) => {
  const title = 'Project Schedule'
  const page = pager(ctx, title)
  const d = (input.summary?.projectScheduleData ?? {}) as { schedules?: Master[]; sections?: Section[]; uploadedImages?: Img[]; uploadedFile?: Img }
  const masters = (d.schedules ?? []).filter((m) => filled(m.task))
  const sections = (d.sections ?? []).filter((s) => filled(s.start, s.finish, s.structureMonths))
  const images = d.uploadedImages ?? (d.uploadedFile ? [d.uploadedFile] : [])

  let y = page()
  if (!masters.length) {
    emptyMessage(ctx, 'No preliminary schedule tasks configured.')
    y = TABLE_TOP + 40
  } else {
    const rows: string[][] = []
    const kinds: ('m' | 's')[] = []
    masters.forEach((m) => {
      rows.push([val(m.task), duration(m), val(m.start), val(m.finish)])
      kinds.push('m')
      ;(m.subTasks ?? []).forEach((s) => {
        rows.push([val(s.task), duration(s), val(s.start), val(s.finish)])
        kinds.push('s')
      })
    })
    y = flowTable(ctx, null, TASK_COLS, rows, y, page, (i) => (kinds[i] === 'm' ? { font: 'B' } : { font: 'R', indent: [16] }))
  }
  if (sections.length)
    y = flowTable(
      ctx,
      'Project Summary',
      SECTION_COLS,
      sections.map((s, i) => [
        String(i + 1),
        val(s.name),
        val(s.start),
        val(s.days || daysBetween(s.start, s.finish)),
        val(s.finish),
        val(s.durationMonths),
        val(s.structureMonths),
      ]),
      y,
      page,
    )
  await imagePages(
    ctx,
    title,
    images.filter((i) => i?.url).map((i) => ({ caption: `Schedule — ${val(i.name)}`, url: String(i.url), name: String(i.name ?? '') })),
    loadImage,
  )
}
export default schedule
