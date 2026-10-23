/* All Design Input — /design-brief/all (original: AllDesignBrief-BSbJaVSk) */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircleCheck, Eye, Send } from 'lucide-react'
import { http } from '@/api/http'
import { downloadPdf, getDesignBrief, getDesignBriefSummary, getProject, primaryRecord } from '@/api/design-brief'
import { useAuth } from '@/auth/AuthContext'
import PageLoader from '@/components/common/PageLoader'
import { Button } from '@/components/ui/button'
import DepartmentViewDialog from '@/components/design-brief/DepartmentViewDialog'
import ReviewComments from '@/components/design-brief/ReviewComments'
import { SUMMARY_CATALOGUE } from '@/components/design-brief/fields'
import { SUPER_ADMIN_ROLES } from '@/components/design-brief/utils'
import type { DesignBriefData, DesignBriefSummary, DeptKey } from '@/types/design-brief'
import type { Project } from '@/types'

type SummaryKey = keyof typeof SUMMARY_CATALOGUE

export default function AllDesignBrief() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [data, setData] = useState<DesignBriefData | null>(null)
  const [summary, setSummary] = useState<DesignBriefSummary>({ remarks: '', sentToDesignTeam: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<SummaryKey | null>(null)
  const role = user?.role?.toLowerCase() ?? ''
  const isSuper = SUPER_ADMIN_ROLES.includes(role)
  const isDesign = role === 'design_admin' || role === 'design_contributor'

  useEffect(() => {
    ;(async () => {
      try {
        const [p, brief, s] = await Promise.all([getProject(projectId!), getDesignBrief(projectId!), getDesignBriefSummary(projectId!)])
        setProject(p)
        setData(brief)
        setSummary(s || { remarks: '', sentToDesignTeam: false })
      } catch (e) {
        console.error('Failed to fetch aggregate data:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const save = async (send = false) => {
    setSaving(true)
    try {
      const body = { ...summary, sentToDesignTeam: send ? true : summary.sentToDesignTeam, sentAt: send ? new Date().toISOString() : summary.sentAt }
      await http.post(`/project/${projectId}/design-brief-summary`, body)
      setSummary(body)
      alert(send ? 'Design brief sent to team successfully!' : 'Remarks saved successfully!')
    } catch (e) {
      console.error('Error saving summary:', e)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const downloadDept = async (key: DeptKey) => {
    try {
      await downloadPdf(`/project/${projectId}/design-brief/${key}/download`, `${key}-design-brief-${projectId}.pdf`)
    } catch (e) {
      console.error(`Error downloading ${key} PDF:`, e)
      alert('Failed to download PDF.')
    }
  }

  if (loading) return <PageLoader />

  const rows = (Object.entries(SUMMARY_CATALOGUE) as [SummaryKey, (typeof SUMMARY_CATALOGUE)[SummaryKey]][]).map(([id, def]) => {
    const list = data?.[id] || []
    const r = primaryRecord(list)
    return {
      id,
      name: def.label,
      owner: r?.Assignee?.name || r?.Creator?.name || '-',
      date: r?.receivedDate ? new Date(r.receivedDate).toLocaleDateString('en-GB') : r?.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '-',
      hasData: list.length > 0,
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">All Departments</h2>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse font-medium">
          <thead className="bg-[#0f5ebb] text-white">
            <tr>
              <th className="px-6 py-4 border-r border-white/20">DEPARTMENT</th>
              <th className="px-6 py-4 border-r border-white/20">OWNER</th>
              <th className="px-6 py-4 border-r border-white/20">DATE</th>
              <th className="px-6 py-4">INPUTS</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">{r.name}</td>
                <td className="px-6 py-4">{r.owner}</td>
                <td className="px-6 py-4">{r.date}</td>
                <td className="px-6 py-4">
                  <button onClick={() => setViewing(r.id)} className="text-green-500 hover:text-green-600 flex items-center gap-1 font-medium transition-colors" disabled={!r.hasData}>
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.sentToDesignTeam && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-blue-50">
            <CircleCheck className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-gray-500 max-w-md mx-auto">This project has been closed and cannot be modified after sending to the design team.</p>
        </div>
      )}

      {(isSuper || role === 'general_admin' || role === 'design_admin') && (
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Add Remarks (Optional)</h3>
            <p className="text-sm text-gray-400">Maximum 500 characters</p>
          </div>
          <textarea
            value={summary.remarks ?? ''}
            onChange={(e) => setSummary({ ...summary, remarks: e.target.value })}
            placeholder="Add any additional notes or comments for MD review..."
            disabled={isDesign}
            className="min-h-[120px] w-full p-3 bg-white border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500"
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-2">
            {!isDesign && (
              <>
                <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                  Save Remarks
                </Button>
                <Button disabled={saving || !!summary.sentToDesignTeam} onClick={() => save(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8">
                  <Send className="w-4 h-4" />
                  {summary.sentToDesignTeam ? 'Sent to Design Team' : 'Send to Design Team'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <DepartmentViewDialog active={viewing} onSelect={setViewing} data={data} projectName={project?.name} onDownload={downloadDept} />

      <ReviewComments
        projectId={projectId}
        department="all"
        activeUser={user}
        title="Comments"
        commentType="mo"
        viewRoles={[...SUPER_ADMIN_ROLES, 'design_admin', 'design admin', 'design_contributor', 'design contributor']}
        postRoles={SUPER_ADMIN_ROLES}
        postTitle="Add MO Feedback / Comment"
      />
    </div>
  )
}
