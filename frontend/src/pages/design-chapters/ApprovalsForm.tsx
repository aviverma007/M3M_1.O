import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileCheck, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageLoader from '@/components/common/PageLoader'
import { DateCell, ListCard, ListPageHeader, SubmitFooter, greenAddBtn, thCls } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import type { ApprovalRow } from '@/types/chapters-b'

const DEFAULT_APPROVALS = [
  'Land License',
  'Zoning & Demarcation',
  'Phasing Plan Approval',
  'Joint Development Right Permission Approval',
  'Environment Clearance (EIA)',
  'Consent to Establish (CTE)',
  'Building Plan',
  'RERA',
]

const blank = (id: number, type = ''): ApprovalRow => ({
  id,
  type,
  plannedSubmission: '',
  actualSubmission: '',
  plannedApproval: '',
  actualApproval: '',
  remarks: '',
})

const DATE_COLS: { key: keyof ApprovalRow; label: string }[] = [
  { key: 'plannedSubmission', label: 'Planned Date of Submission' },
  { key: 'actualSubmission', label: 'Actual Date of Submission' },
  { key: 'plannedApproval', label: 'Planned Date of Approval' },
  { key: 'actualApproval', label: 'Actual Date of Approval' },
]

export default function ApprovalsForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<ApprovalRow[]>([])

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      if (s?.approvalsData && s.approvalsData.length > 0) setRows(s.approvalsData)
      else setRows(DEFAULT_APPROVALS.map((t, i) => blank(i, t)))
    },
    { delay: 500, label: 'approvals data' },
  )

  const update = (id: number, key: keyof ApprovalRow, value: string) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: value } : x)))

  const submit = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { approvalsData: rows })
      toast.success('Approvals saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving approvals:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <ListPageHeader title="Approvals" subtitle="Configure unit area parameters and view efficiency calculations" />
      <ListCard
        icon={<FileCheck size={18} />}
        title="Approvals"
        action={
          <Button onClick={() => setRows([...rows, blank(Date.now())])} className={greenAddBtn}>
            <Plus size={16} /> Add Approvals
          </Button>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#00509d] text-white">
              <th className={`${thCls} w-[18%]`}>Approval</th>
              {DATE_COLS.map((c) => (
                <th key={c.key} className={`${thCls} w-[15%]`}>
                  {c.label}
                </th>
              ))}
              <th className={`${thCls} w-[18%]`}>Remarks</th>
              <th className={`${thCls} w-12 text-center`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Input
                    value={a.type}
                    onChange={(e) => update(a.id, 'type', e.target.value)}
                    className="h-10 text-[12px] bg-white border-gray-100 focus:bg-white rounded-xl font-bold text-gray-700"
                    placeholder="Enter Approval Type"
                  />
                </td>
                {DATE_COLS.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <DateCell value={String(a[c.key] ?? '')} onChange={(v) => update(a.id, c.key, v)} className="h-10 text-[12px] bg-white border-gray-100 rounded-xl" />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Input
                    value={a.remarks}
                    onChange={(e) => update(a.id, 'remarks', e.target.value)}
                    className="h-10 text-[12px] bg-white border-gray-100 rounded-xl"
                    placeholder="Enter Remarks"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setRows(rows.filter((x) => x.id !== a.id))} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>
      <SubmitFooter saving={saving} onSubmit={submit} />
    </div>
  )
}
