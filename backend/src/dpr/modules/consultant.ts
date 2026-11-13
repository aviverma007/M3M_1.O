import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, pager, TABLE_TOP, val, type Col } from './cs-table.js'
import { consultantFees, rupees } from '@/lib/fees'
import { fmtNum } from '@/lib/projectComparison'

type ConsultantRow = { type?: string; name?: string; status?: string; plannedDate?: string; actualDate?: string; remarks?: string; fee?: string }

const COLS: Col[] = [
  { label: 'Consultant', width: 130 },
  { label: 'Name', width: 112 },
  { label: 'Status', width: 78 },
  { label: 'Planned Date', width: 78 },
  { label: 'Actual Date', width: 78 },
  { label: 'Order Value (Rs.)', width: 96 },
  { label: 'Rs./sq ft BUA', width: 68 },
  { label: 'Remarks', width: 120 },
]

const consultant: ModuleRenderer = (ctx, input) => {
  const page = pager(ctx, 'Design Considerations — Consultants Strategy')
  const rows = (Array.isArray(input.summary?.consultantStrategyData) ? input.summary!.consultantStrategyData : []) as ConsultantRow[]
  if (!rows.length) {
    pager(ctx, 'Consultant Strategy')()
    return emptyMessage(ctx, 'No consultants details configured.')
  }
  page()
  const fees = consultantFees(input.summary, rows)
  const body = rows.map((r, i) => {
    const l = fees.lines[i]
    return [val(r.type), val(r.name), val(r.status), val(r.plannedDate), val(r.actualDate), l.fee !== null ? rupees(l.fee) : '-', l.perSqft !== null ? fmtNum(l.perSqft, 2) : '-', val(r.remarks)]
  })
  if (fees.total !== null)
    body.push(['TOTAL', '', '', '', '', rupees(fees.total), fees.perSqft !== null ? fmtNum(fees.perSqft, 2) : '-', fees.bua ? `BUA ${fmtNum(fees.bua, 0)} sq ft` : ''])
  const totalRow = fees.total !== null ? body.length - 1 : -1
  drawTable(ctx, COLS, body, TABLE_TOP, page, (i) => (i === totalRow ? { font: 'B', fill: '#EEF2F8' } : {}))
}
export default consultant
