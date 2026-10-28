import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, filled, pager, TABLE_TOP, val, type Col } from './cs-table.js'

type ApprovalRow = { type?: string; plannedSubmission?: string; actualSubmission?: string; plannedApproval?: string; actualApproval?: string; remarks?: string }

const COLS: Col[] = [
  { label: 'Approval / License', width: 155 },
  { label: 'Planned Date', width: 105 },
  { label: 'Actual Date', width: 105 },
  { label: 'Planned Approval Date', width: 135 },
  { label: 'Actual Approval Date', width: 135 },
  { label: 'Remarks', width: 95 },
]

/** rows count as configured once any date or remark is entered (the default template rows only carry a type) */
const approvals: ModuleRenderer = (ctx, input) => {
  const all = (Array.isArray(input.summary?.approvalsData) ? input.summary!.approvalsData : []) as ApprovalRow[]
  const rows = all.filter((r) => filled(r.plannedSubmission, r.actualSubmission, r.plannedApproval, r.actualApproval, r.remarks))
  if (!rows.length) {
    pager(ctx, 'Approval Considerations')()
    return emptyMessage(ctx, 'No approval timelines configured.')
  }
  const page = pager(ctx, 'Design Considerations — Approval Strategy')
  drawTable(
    ctx,
    COLS,
    rows.map((r) => [val(r.type), val(r.plannedSubmission), val(r.actualSubmission), val(r.plannedApproval), val(r.actualApproval), val(r.remarks)]),
    page(),
    page,
  )
}
export default approvals
