/** One module card on /dashboard/project/:id/modules (original `xe` in page-DSi__SG4). */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, CircleCheck, Eye, FileDown, LoaderCircle, Lock, SlidersVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { http } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import { useViewOnly } from '@/state/viewOnly'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import type { RoleDef } from '@/types'
import { setModulePreview } from '@/components/module-workspace/preview'

/* /roles is fetched once per burst of cards (same de-dup as original) */
let rolesPromise: Promise<RoleDef[]> | null = null
function fetchRoles() {
  if (!rolesPromise) {
    rolesPromise = http
      .get<{ data: RoleDef[] }>('/roles')
      .then((r) => r?.data || [])
      .catch(() => [])
      .finally(() => {
        rolesPromise = null
      })
  }
  return rolesPromise
}

/** Default module access per department when no `<company>:<dept>` role exists. */
const DEPT_MODULES: Record<string, string[]> = {
  super_admin: ['*'],
  design: ['Key Ratio', 'Apartment Design', 'Common Design', 'Design Brief', 'Project Details + Layout Plans.', 'Project Level Design', 'Unit Level Design', 'Service Design Consideration', 'Export Configuration'],
  design_arch: [
    'Project Details + Layout Plans.',
    'Project Level Design',
    'Unit Level Design',
    'ID Specifications',
    'Common Area',
    'Landscape & Amenities',
    'Service Design Consideration',
    'Consultant Strategy',
    'Phasing Plans',
    'Approvals',
    'Export Configuration',
  ],
  design_str: ['Structures'],
  design_mep: ['MEP'],
  structure: ['Structures'],
  mep: ['MEP'],
  interior: ['ID Specifications', 'Common Area'],
  pmo: ['Contracting Strategy', 'Consultant Strategy', 'Project Schedule', 'Additional Details', 'Export Configuration'],
  cp: ['Contracting Strategy'],
  liaison: ['Approvals'],
  pmo_budget: ['Additional Details'],
  bt: [],
  pl: [],
}

/** module name -> DPR chapter name used by POST /project/:id/export-dpr-pdf */
const DPR_NAME: Record<string, string> = {
  'Project Details + Layout Plans.': 'Project Details + Layout Plans',
  'Project Details + Layout Plans': 'Project Details + Layout Plans',
  'Unit Level Design': 'Unit Level Design',
  'Project Level Design': 'Project Level Design',
  Structures: 'Structure',
  MEP: 'MEP',
  'ID Specifications': 'ID Specifications',
  'Common Area': 'Common Area',
  'Landscape & Amenities': 'Landscape & Amenities',
  'Service Design Consideration': 'Service Design Consideration',
  'Contracting Strategy': 'Contracting Strategy',
  'Consultant Strategy': 'Consultant Strategy',
  'Phasing Plans': 'Phasing Plan',
  'Project Schedule': 'Project Schedule',
  Approvals: 'Approvals',
  'Additional Details': 'Additional Project Details',
}

/** design-chapter slug for DPR modules */
const CHAPTER_SLUG: Record<string, string> = {
  'Project Details + Layout Plans.': 'project-details',
  'Project Level Design': 'project-level-design',
  'Unit Level Design': 'unit-level-design',
  'ID Specifications': 'id-specifications',
  'Common Area': 'common-area',
  'Landscape & Amenities': 'landscape-amenities',
  'Service Design Consideration': 'service-design',
  'Contracting Strategy': 'contracting-strategy',
  'Consultant Strategy': 'consultant-strategy',
  'Phasing Plans': 'phasing-plan',
  'Project Schedule': 'project-schedule',
  Approvals: 'approvals',
  'Additional Details': 'additional-details',
}

export type ModuleCardProps = {
  moduleNo: number
  moduleId: number
  moduleName: string
  moduleStatus?: string
  parameters?: number
  deviations?: number
  benchmark?: number
  projectId: string
  firstChapterId: number | null
  moApprovedDocUrl?: string | null
  isDPR: boolean
}

type Access = 'none' | 'view' | 'edit'

export default function ModuleCard({
  moduleNo,
  moduleId,
  moduleName,
  moduleStatus,
  parameters,
  deviations,
  benchmark,
  projectId,
  firstChapterId,
  moApprovedDocUrl,
  isDPR,
}: ModuleCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setViewOnly } = useViewOnly()
  const department = user?.department || ''
  const company = user?.company || ''
  const [rolePerms, setRolePerms] = useState<Record<string, string> | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!department) {
      setRolePerms({})
      return
    }
    const key = company ? `${company}:${department}` : `dept:${department}`
    fetchRoles().then((roles) => {
      const role = roles.find((r) => r.roleName === key)
      if (!role) return setRolePerms({})
      const perms: Record<string, string> = {}
      ;(role.permissions || [])
        .filter((p) => p.name?.startsWith('module:'))
        .forEach((p) => (perms[p.name.replace('module:', '')] = p.access || (p.status ? 'edit' : 'none')))
      setRolePerms(perms)
    })
  }, [department, company])

  const isSuperAdmin = ['super_admin', 'superadmin'].includes((user?.role || '').toLowerCase()) || department === 'super_admin'
  const access: Access = (() => {
    // Super admin has full rights on every module (the original app locked modules 1-3 for everyone).
    if (isSuperAdmin) return 'edit'
    if (moduleNo <= 3) return 'none'
    if (rolePerms !== null && moduleName in rolePerms) return rolePerms[moduleName] as Access
    if (moduleNo === 4 || !department || department === 'super_admin') return 'edit'
    const list = DEPT_MODULES[department] || []
    return list.includes(moduleName) || list.includes('*') ? 'edit' : 'none'
  })()
  const canOpen = access !== 'none'
  const isView = access === 'view'
  const dpr = isDPR || moduleId === 7
  const isDesignBrief = moduleName === 'Design Brief'
  const briefMissing = isDesignBrief && !moApprovedDocUrl
  const isPreConcept = moduleName === 'Pre Concept Design & Checklist'
  const dprName = DPR_NAME[moduleName]

  const download = async (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.()
    setDownloading(true)
    try {
      if (isDesignBrief) {
        const blob = await http.get<Blob>(`/project/${projectId}/design-brief/download?type=mo`, { responseType: 'blob' })
        downloadBlob(blob, `Design_Brief_MO_Report_${projectId}.pdf`)
      } else if (dprName) {
        const blob = await http.post<Blob>(`/project/${projectId}/export-dpr-pdf`, { selectedModules: [dprName] }, { responseType: 'blob' })
        downloadBlob(blob, `${moduleName.replace(/[^a-z0-9]/gi, '_')}_${projectId}.pdf`)
      } else alert('Download not available for this module.')
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Failed to download PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const open = () => {
    setModulePreview(false)
    setViewOnly(isView)
    const base = `/dashboard/project/${projectId}`
    if (moduleName === 'Structures') return navigate(`${base}/design-chapters/structure`)
    if (moduleName === 'MEP') return navigate(`${base}/design-chapters/mep`)
    const chapter = `${base}/modules/${moduleId}/chapter/${firstChapterId}`
    let to: string
    // decided by module name: our database numbers modules 1..20, unlike the original (where id 4 was the commercial key ratio)
    if (/key ratio/i.test(moduleName)) to = `${base}/modules/${moduleId}/keyratio`
    else if (moduleName === 'Export Configuration') to = `${base}/design-chapters/export-configuration`
    else if (isDesignBrief) to = `${base}/design-brief`
    else if (CHAPTER_SLUG[moduleName]) to = `${base}/design-chapters/${CHAPTER_SLUG[moduleName]}`
    else if (dpr) to = chapter
    else to = isPreConcept ? `${base}/concept` : chapter
    navigate(to)
  }
  const onCardClick = () => canOpen && open()

  return (
    <div
      className={cn(
        'flex flex-col gap-4 h-full w-full max-w-[400px] mx-auto bg-white rounded-xl shadow-sm border p-6 relative transition-all duration-300',
        access === 'none' && 'opacity-60 grayscale-[0.5] cursor-not-allowed border-gray-100',
        access === 'view' && 'hover:shadow-md hover:-translate-y-1 cursor-pointer border-blue-100',
        access === 'edit' && 'hover:shadow-md hover:-translate-y-1 cursor-pointer border-gray-100',
      )}
      onClick={onCardClick}
    >
      {access === 'none' && (
        <div className="absolute inset-0 backdrop-blur-[1px] bg-gray-900/5 flex items-center justify-center z-10 rounded-xl">
          <div className="bg-white/90 p-3 rounded-full shadow-lg">
            <Lock size={20} className="text-[#e63946]" />
          </div>
        </div>
      )}
      {access === 'view' && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          <Eye size={9} /> View only
        </div>
      )}
      {(moduleStatus === 'completed' || dpr) && (
        <div className="absolute top-4 right-4 bg-green-500 rounded-full p-0.5 border-2 border-white shadow-sm">
          <CircleCheck size={14} className="text-white fill-green-500" />
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 mb-2">
        <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">MODULE {moduleNo}</span>
        <h4 className="text-lg font-bold text-[#00509d] text-center leading-tight hover:text-blue-700 transition-colors">{moduleName}</h4>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 justify-center">
          <div className="flex items-center gap-2 bg-[#e6f0ff] px-3 py-1.5 rounded-md">
            <SlidersVertical size={14} className="text-[#00509d]" />
            <span className="text-[11px] font-semibold text-[#00509d]">
              All Departments: <span className="font-bold text-black ml-0.5">{parameters || 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#fff0f0] px-3 py-1.5 rounded-md">
            <CircleAlert size={14} className="text-[#e63946]" />
            <span className="text-[11px] font-semibold text-[#e63946]">
              Due: <span className="font-bold text-black ml-0.5">{deviations || 0}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#f0fff4] px-4 py-1.5 rounded-md self-center border border-[#c6f6d5]">
          <CircleCheck size={14} className="text-[#2f855a] fill-[#2f855a]" />
          <span className="text-[11px] font-semibold text-[#2f855a]">
            On Track <span className="font-bold text-black ml-1.5">{benchmark || 0}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4 pt-2">
        <Button
          className="flex-1 bg-[#4caf50] hover:bg-[#43a047] text-white gap-2 h-9 text-xs font-bold rounded-lg shadow-sm transition-all border-none disabled:pointer-events-auto disabled:cursor-not-allowed"
          onClick={(e) => {
            e.stopPropagation()
            if (canOpen && !briefMissing && (dprName || isDesignBrief)) download(e)
          }}
          disabled={downloading || !canOpen || briefMissing || (!dprName && !isDesignBrief)}
          title={briefMissing ? 'MO Approved Design Brief is not uploaded yet' : !dprName && !isDesignBrief ? 'Download not available for this module' : undefined}
        >
          {downloading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <FileDown size={15} />}
          Download
        </Button>
        <Button
          disabled={!canOpen}
          className="flex-1 bg-[#4caf50] hover:bg-[#43a047] text-white gap-2 h-9 text-xs font-bold rounded-lg shadow-sm transition-all border-none"
          onClick={(e) => {
            e.stopPropagation()
            onCardClick()
          }}
        >
          <Eye size={15} />
          {access === 'none' ? 'Locked' : 'View'}
        </Button>
      </div>
    </div>
  )
}
