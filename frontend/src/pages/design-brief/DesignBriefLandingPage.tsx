/* Design Brief landing — /dashboard/project/:projectId/design-brief (original: page-Cb55q5a3) */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, CircleCheckBig, FileText, User } from 'lucide-react'
import { http } from '@/api/http'
import { downloadPdf, getAssignees, getDesignBrief, getProject, primaryRecord } from '@/api/design-brief'
import { useAuth } from '@/auth/AuthContext'
import PageLoader from '@/components/common/PageLoader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import AssignDialog, { EMPTY_ASSIGN, type AssignForm } from '@/components/design-brief/AssignDialog'
import { DEPT_PATH_TO_KEY } from '@/components/design-brief/fields'
import { daysBetween, endOfDay, fmtShort, isDone } from '@/components/design-brief/utils'
import type { BriefUser, DesignBriefData, DeptKey, DeptPath, DeptRecord } from '@/types/design-brief'
import type { Project } from '@/types'

type Card = { id: number; name: string; path: DeptPath; key: DeptKey }
const CARDS: Card[] = [
  { id: 1, name: 'Liaison', path: 'liaison', key: 'liaison' },
  { id: 2, name: 'Business Development', path: 'business-development', key: 'businessDevelopment' },
  { id: 3, name: 'Land', path: 'land', key: 'land' },
  { id: 4, name: 'Structure', path: 'structure', key: 'structure' },
  { id: 5, name: 'MEP', path: 'mep', key: 'mep' },
]

const DESIGN_REVIEWER_ROLES = ['super_admin', 'superadmin', 'admin', 'super admin', 'design_admin', 'design_contributor']

type CardStatus = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }

function cardStatus(rec: DeptRecord | null): CardStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (rec && isDone(rec)) {
    const deadline = rec.deadline ? endOfDay(rec.deadline) : null
    const received = rec.receivedDate ? new Date(rec.receivedDate) : new Date()
    if (!deadline || received <= deadline) return { label: 'Submitted', variant: 'default', className: 'bg-green-100 text-green-600 hover:bg-green-100' }
    return { label: `Late by ${daysBetween(received, deadline)} days`, variant: 'secondary', className: 'bg-orange-100 text-orange-600 hover:bg-orange-100' }
  }
  if (rec?.deadline) {
    const deadline = endOfDay(rec.deadline)
    if (today > deadline) return { label: `Overdue by ${daysBetween(today, deadline)} days`, variant: 'destructive' }
  }
  return rec?.assignedTo ? { label: 'Pending', variant: 'outline' } : { label: 'Not Assigned', variant: 'outline' }
}

/** can the user open a department's form? (super admin / design department: all; else own department) */
function canOpen(user: BriefUser | null, path: DeptPath) {
  if (!user) return false
  const role = user.role?.toLowerCase()
  const dept = user.department?.toLowerCase()
  if (['super_admin', 'superadmin', 'admin'].includes(role) || dept === 'design') return true
  const map: Record<string, string[]> = {
    mep: ['mep'],
    structure: ['structure'],
    land: ['land'],
    liaison: ['liaison'],
    bd: ['business-development', 'bd'],
    business_development: ['business-development'],
    'business-development': ['business-development'],
  }
  return !!(dept && map[dept]?.includes(path)) || dept === path || dept === path.replace('-', '')
}

const DownloadIcon = ({ className }: { className: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export default function DesignBriefLandingPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<DesignBriefData | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AssignForm>(EMPTY_ASSIGN)
  const [members, setMembers] = useState<BriefUser[]>([])
  const [activePath, setActivePath] = useState<DeptPath | null>(null)
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [brief, proj] = await Promise.all([getDesignBrief(projectId!), getProject(projectId!)])
        setData(brief)
        setProject(proj)
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const rec = (key: DeptKey) => primaryRecord(data?.[key])

  const openAssign = async (card: Card) => {
    setDialogOpen(true)
    setActivePath(card.path)
    const r = rec(DEPT_PATH_TO_KEY[card.path])
    setActiveRecordId(r?.id ?? null)
    setForm({
      memberId: r?.assignedTo?.toString() || '',
      instructions: r?.instructions || '',
      dueDate: r?.deadline?.split('T')[0] || '',
    })
    try {
      setMembers(await getAssignees(card.path))
    } catch (e) {
      console.error('Error fetching team members:', e)
    }
  }

  const assign = async () => {
    if (!form.memberId) {
      alert('Please select a team member')
      return
    }
    setAssigning(true)
    try {
      const body = {
        projectId: parseInt(projectId!),
        assignedTo: parseInt(form.memberId),
        deadline: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        instructions: form.instructions || '',
      }
      if (activeRecordId) await http.patch(`/${activePath}/${activeRecordId}`, body)
      else await http.post(`/${activePath}`, body)
      alert('Task assigned successfully')
      setDialogOpen(false)
      setData(await getDesignBrief(projectId!))
    } catch (e) {
      console.error('Error assigning task:', e)
      alert('Failed to assign task')
    } finally {
      setAssigning(false)
    }
  }

  const downloadInhouse = async () => {
    setDownloading(true)
    try {
      await downloadPdf(`/project/${projectId}/design-brief/download`, `${project?.name?.replace(/\s+/g, '_') || 'Project'}_Design_Brief.pdf`)
    } catch (e) {
      console.error('Error downloading PDF:', e)
      alert('Failed to download PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const downloadDept = async (key: DeptKey) => {
    try {
      await downloadPdf(`/project/${projectId}/design-brief/${key}/download`, `${key}_design_brief_${projectId}.pdf`)
    } catch (e) {
      console.error(`Error downloading ${key} PDF:`, e)
      alert('Failed to download department PDF.')
    }
  }

  if (loading) return <PageLoader />

  const isReviewer = DESIGN_REVIEWER_ROLES.includes(user?.role?.toLowerCase() ?? '')
  const hasDoc = !!data?.summary?.inHouseDocUrl

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Inhouse Design Document</h3>
        <div className={`flex items-center justify-between ${hasDoc ? 'bg-blue-50' : 'bg-gray-50 opacity-75'} p-4 rounded-lg`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 bg-white ${hasDoc ? 'text-blue-600' : 'text-gray-400'} rounded-lg shadow-sm`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className={`font-semibold ${hasDoc ? 'text-gray-800' : 'text-gray-500'}`}>{hasDoc ? 'Inhouse_Design_Document.pdf' : 'No document available'}</p>
              <p className="text-xs text-gray-500">
                {hasDoc
                  ? `Last updated: ${fmtShort(data!.summary!.sentAt || data!.summary!.updatedAt)}`
                  : 'Please wait for the design team to upload the document'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className={hasDoc ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'}
            onClick={hasDoc ? downloadInhouse : undefined}
            disabled={downloading || !hasDoc}
          >
            <DownloadIcon className="mr-2" />
            {downloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Assigned Department</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card) => {
            const allowed = canOpen(user as BriefUser | null, card.path)
            const r = rec(card.key)
            const status = cardStatus(r)
            const assignee = r?.Assignee?.name || r?.Creator?.name || '-'
            const list = data?.[card.key]
            return (
              <div
                key={card.id}
                onClick={() => allowed && navigate(`/dashboard/project/${projectId}/design-brief/${card.path}`)}
                className={`rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col transition-shadow duration-300 ${allowed ? 'cursor-pointer hover:shadow-md' : 'opacity-60 cursor-not-allowed'}`}
              >
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-800 text-lg">{card.name}</h4>
                    </div>
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 font-medium">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="w-16">Assignee</span>
                      <span className="text-gray-800 font-semibold uppercase">{assignee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="w-16">Deadline</span>
                      <span className="text-gray-800">{fmtShort(r?.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleCheckBig size={14} className="text-gray-400" />
                      <span className="w-16">Received</span>
                      <span className="text-gray-800">{fmtShort(r?.receivedDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex gap-3">
                  {isReviewer && (
                    <Button
                      variant="outline"
                      className="flex-1 bg-white text-gray-600 font-normal px-2 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAssign(card)
                      }}
                    >
                      {assignee !== '-' ? (
                        <>
                          <Calendar className="w-4 h-4 mr-1.5 flex-shrink-0" />
                          Manage Timeline
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 flex-shrink-0">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                          </svg>
                          Assign Task
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 bg-white text-gray-600 font-normal px-2 text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadDept(card.key)
                    }}
                    disabled={!list || list.length === 0}
                  >
                    <DownloadIcon className="mr-1.5 flex-shrink-0" />
                    Download
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AssignDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} onChange={setForm} members={members} onAssign={assign} assigning={assigning} />
    </div>
  )
}
