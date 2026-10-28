/* Layout for the design-brief sub pages (original: DesignBriefLayout-C6YqCpgv) */
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Download, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { downloadPdf, getComments, getDesignBrief, getProject, primaryRecord } from '@/api/design-brief'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import { ContributorBanner, FinalActionCard, FinalCommentsCard, FinalProjectCard } from '@/components/design-brief/LayoutCards'
import { DEPT_PATH_TO_KEY } from '@/components/design-brief/fields'
import { daysBetween, endOfDay, fmtShort, isDone, SUPER_ADMIN_ROLES } from '@/components/design-brief/utils'
import type { BriefComment, BriefUser, DesignBriefData, DesignBriefOutletContext, DeptPath, DeptRecord } from '@/types/design-brief'
import type { Project } from '@/types'

const TABS = [
  { id: 'liaison', label: 'Liaison' },
  { id: 'business-development', label: 'Business Development' },
  { id: 'land', label: 'Land' },
  { id: 'structure', label: 'Structure' },
  { id: 'mep', label: 'MEP' },
  { id: 'all', label: 'All Design Input' },
  { id: 'final-submission', label: 'Final Submission' },
] as const

const DEPT_ACCESS: Record<string, string[]> = {
  mep: ['mep'],
  structure: ['structure'],
  land: ['land'],
  liaison: ['liaison'],
  bd: ['business-development'],
  anarock: ['anarock'],
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const recordsFor = (data: DesignBriefData | null, tab: string) => (data ? data[DEPT_PATH_TO_KEY[tab as DeptPath] ?? (tab as never)] : undefined)

/** "Submitted - On Time" / "Overdue By N Days" / "On Track" … for the active tab (same rules as original). */
function deadlineStatus(data: DesignBriefData | null, tab: string) {
  if (!data) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (tab && tab !== 'all' && tab !== 'final-submission') {
    const list = recordsFor(data, tab)
    const r = primaryRecord(list)
    if (r) {
      if (r.receivedDate || r.status === 'Completed' || r.status === 'Submitted') {
        const deadline = r.deadline ? endOfDay(r.deadline) : null
        const received = r.receivedDate ? new Date(r.receivedDate) : new Date()
        return !deadline || received <= deadline ? 'Submitted - On Time' : `Submitted - Late by ${daysBetween(received, deadline)} days`
      }
      if (r.deadline) {
        const deadline = endOfDay(r.deadline)
        if (today > deadline) return `Overdue By ${daysBetween(today, deadline)} Days`
      }
      return 'Pending'
    }
  }
  let worst = 0
  Object.values(data).forEach((list) => {
    if (!Array.isArray(list)) return
    list.forEach((r: DeptRecord) => {
      if (r.deadline && !r.receivedDate && r.status !== 'Completed' && r.status !== 'Submitted') {
        const deadline = endOfDay(r.deadline)
        if (today > deadline) worst = Math.max(worst, daysBetween(today, deadline))
      }
    })
  })
  return worst > 0 ? `Overdue By ${worst} Days` : 'On Track'
}

export default function DesignBriefLayout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const activeUser = user as BriefUser | null
  const [downloading, setDownloading] = useState(false)
  const [, setAssignmentData] = useState<DeptRecord | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [data, setData] = useState<DesignBriefData | null>(null)
  const [comments, setComments] = useState<BriefComment[]>([])

  const last = location.pathname.split('/').pop() ?? ''
  const activeTab = TABS.find((t) => t.id === last)
  const active: string = activeTab ? last : 'liaison'
  const dept = activeUser?.department || ''

  const tabAllowed = useCallback(
    (id: string) => !dept || dept === 'super_admin' || dept === 'design' || id === 'final-submission' || id === 'all' || !!DEPT_ACCESS[dept]?.includes(id),
    [dept],
  )

  useEffect(() => {
    if (!tabAllowed(active)) {
      const first = TABS.find((t) => tabAllowed(t.id))
      if (first) navigate(`/dashboard/project/${projectId}/design-brief/${first.id}`, { replace: true })
    }
  }, [active, tabAllowed, navigate, projectId])

  const role = activeUser?.role?.toLowerCase() ?? ''
  const isSuper = SUPER_ADMIN_ROLES.includes(role)
  const isDesignReviewer = [...SUPER_ADMIN_ROLES, 'design_admin', 'design_contributor'].includes(role)
  const showSidebar = isDesignReviewer && (!dept || ['super_admin', 'superadmin', 'design'].includes(dept.toLowerCase()))
  const activeList = recordsFor(data, active)
  const isContributor =
    role === 'general_contributor' ||
    (['general_admin', 'general admin'].includes(role) && Array.isArray(activeList) && activeList.some((r) => r.assignedTo === activeUser?.id))
  const primary = primaryRecord(activeList)
  const canApprove = !!primary && (isSuper || (['general_admin', 'general admin', 'design_admin', 'design admin'].includes(role) && primary.assignedTo !== activeUser?.id))

  const refreshData = useCallback(async () => {
    try {
      const [brief, proj, cmts] = await Promise.all([getDesignBrief(projectId!), getProject(projectId!), getComments(projectId!, 'all')])
      setData(brief)
      setProject(proj)
      setComments(cmts || [])
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  }, [projectId])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const lastModified = () => {
    let latest = project?.updatedAt ? new Date(project.updatedAt) : new Date(0)
    if (data)
      Object.values(data).forEach((list) => {
        if (Array.isArray(list))
          list.forEach((r: DeptRecord) => {
            if (r.updatedAt && new Date(r.updatedAt) > latest) latest = new Date(r.updatedAt)
          })
      })
    return latest.getTime() > 0 ? latest.toISOString() : null
  }

  const tabState = (id: string) => {
    const list = recordsFor(data, id)
    return Array.isArray(list) && list.length > 0 && list.some(isDone) ? 'done' : 'pending'
  }

  const downloadMo = async () => {
    setDownloading(true)
    try {
      await downloadPdf(`/project/${projectId}/design-brief/download?type=mo`, `Design_Brief_MO_Report_${projectId}.pdf`)
      toast.success('Design Brief downloaded successfully!')
    } catch (e) {
      console.error('Error downloading PDF:', e)
      toast.error('Failed to download Design Brief.')
    } finally {
      setDownloading(false)
    }
  }

  const status = deadlineStatus(data, active)
  const ctx: DesignBriefOutletContext = { setAssignmentData, activeUser, dashboardData: data, refreshData, canApprove }

  return (
    <div className={`p-6 pb-20 w-full space-y-6 ${isContributor && role === 'general_contributor' ? '-mt-6' : ''}`}>
      {(!isContributor || ['general_admin', 'general admin'].includes(role)) && (
        <div className="bg-white rounded-lg p-6 shadow-sm border space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-[#1e293b]">
                {project?.name || 'Project Name'} - {cap(project?.projectType)} Property
              </h1>
              {data?.summary?.moApprovedDocUrl && (
                <Button
                  onClick={downloadMo}
                  disabled={downloading}
                  className="bg-[#0f5ebb] hover:bg-[#0f5ebb]/90 text-white shadow-md hover:scale-105 active:scale-95 transition-all duration-300 gap-2 h-10 px-4"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download Design Brief PDF'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                Project Stage:{' '}
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-blue-100 font-bold px-2 py-0.5">
                  Design Brief
                </Badge>
              </div>
              <div>
                Last Updated On: <span className="font-bold text-gray-800">{fmtShort(lastModified())}</span>
              </div>
              <div>
                Deadline Status: <span className={`font-bold ${status?.includes('Overdue') ? 'text-orange-500' : 'text-green-500'}`}>{status || ''}</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <Link to="/dashboard" className="hover:underline">
                Dashboards
              </Link>
              <span>/</span>
              <Link to={`/dashboard?projectType=${project?.projectType?.toLowerCase()}`} className="hover:underline">
                {cap(project?.projectType)}
              </Link>
              <span>/</span>
              <Link to={`/dashboard/project/${projectId}/modules`} className="hover:underline">
                Project Governance
              </Link>
              <span>/</span>
              <span className="font-bold text-gray-600">Design Brief</span>
            </div>
          </div>
        </div>
      )}

      {isContributor && role === 'general_contributor' && <ContributorBanner activeDeptLabel={activeTab?.label || active} projectId={projectId} />}

      <div className={`grid grid-cols-1 ${showSidebar ? 'md:grid-cols-4' : ''} gap-6 items-start`}>
        {showSidebar && (
          <div className="md:col-span-1 space-y-6">
            {last === 'final-submission' ? (
              <>
                <FinalProjectCard project={project} lastModified={lastModified()} />
                <FinalActionCard isClosed={project?.status === 'completed'} />
                <FinalCommentsCard comments={comments} />
              </>
            ) : (
              <div className="bg-white shadow-sm border rounded-lg overflow-hidden flex flex-col border-gray-200">
                {TABS.filter((t) => !(t.id === 'final-submission' && isSuper)).map((t) => {
                  const isActive = active === t.id
                  const done = tabState(t.id) === 'done'
                  const allowed = tabAllowed(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => allowed && navigate(`/dashboard/project/${projectId}/design-brief/${t.id}`)}
                      disabled={!allowed}
                      className={`flex justify-between items-center px-4 py-3 text-sm font-medium transition-colors text-left border-l-4 ${isActive ? 'bg-blue-50 text-blue-700 border-blue-600' : allowed ? 'text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-300' : 'opacity-60 cursor-not-allowed bg-gray-50 text-gray-400 border-transparent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600' : done ? 'bg-green-500' : 'bg-gray-200'}`}>
                          {done ? (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-gray-400" />
                          )}
                        </div>
                        {t.label}
                      </div>
                      {!allowed && <Lock size={14} className="text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div className={`space-y-6 ${showSidebar ? 'md:col-span-3' : 'col-span-full'}`}>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <Outlet context={ctx} />
          </div>
        </div>
      </div>
    </div>
  )
}
