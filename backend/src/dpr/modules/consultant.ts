import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, pager, TABLE_TOP, val, type Col } from './cs-table.js'

type ConsultantRow = { type?: string; name?: string; status?: string; plannedDate?: string; actualDate?: string; remarks?: string }

const COLS: Col[] = [
  { label: 'Consultant', width: 150 },
  { label: 'Name', width: 140 },
  { label: 'Status', width: 90 },
  { label: 'Planned Date', width: 110 },
  { label: 'Actual Date', width: 110 },
  { label: 'Remarks', width: 130 },
]

const consultant: ModuleRenderer = (ctx, input) => {
  const page = pager(ctx, 'Design Considerations — Consultants Strategy')
  const rows = (Array.isArray(input.summary?.consultantStrategyData) ? input.summary!.consultantStrategyData : []) as ConsultantRow[]
  page()
  if (!rows.length) return emptyMessage(ctx, 'No consultants configured.')
  drawTable(
    ctx,
    COLS,
    rows.map((r) => [val(r.type), val(r.name), val(r.status), val(r.plannedDate), val(r.actualDate), val(r.remarks)]),
    TABLE_TOP,
    page,
  )
}
export default consultant
