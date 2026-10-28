import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { drawTable, filled, pager, TABLE_TOP, val, type Col } from './cs-table.js'

type ApprovalRow = { type?: string; plannedSubmission?: string; actualSubmission?: string; plannedApproval?: string; actualApproval?: string; remarks?: string }

const COLS: Col[] = [
  { label: 'Approval', width: 170 },
  { label: 'Planned Date of Submission', width: 105 },
  { label: 'Actual Date of Submission', width: 105 },
  { label: 'Planned Date of Approval', width: 105 },
  { label: 'Actual Date of Approval', width: 105 },
  { label: 'Remarks', width: 140 },
]

/** rows count as configured once any date or remark is entered (the default template rows only carry a type) */
const approvals: ModuleRenderer = (ctx, input) => {
  const page = pager(ctx, 'Approval Considerations')
  const all = (Array.isArray(input.summary?.approvalsData) ? input.summary!.approvalsData : []) as ApprovalRow[]
  const rows = all.filter((r) => filled(r.plannedSubmission, r.actualSubmission, r.plannedApproval, r.actualApproval, r.remarks))
  page()
  if (!rows.length) return emptyMessage(ctx, 'No approval timelines configured.')
  drawTable(
    ctx,
    COLS,
    rows.map((r) => [val(r.type), val(r.plannedSubmission), val(r.actualSubmission), val(r.plannedApproval), val(r.actualApproval), val(r.remarks)]),
    TABLE_TOP,
    page,
  )
}
export default approvals
