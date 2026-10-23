/* Design chapters hub: /dashboard/project/:projectId/design-chapters (original DesignChaptersPage). */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/common/PageLoader'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { getProject } from '@/api/chapters-a'
import type { Project } from '@/types'

/** chapter ids each department may open (same table as the original) */
const DEPARTMENT_CHAPTERS: Record<string, number[]> = {
  super_admin: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  design: [21, 22, 23, 24, 29, 30],
  structure: [25],
  mep: [26],
  interior: [27, 28],
  pmo: [31, 32, 33, 34, 35, 36, 40],
}

const CHAPTERS: { id: number; name: string; slug: string }[] = [
  { id: 22, name: 'Project Details + Layout Plans.', slug: 'project-details' },
  { id: 24, name: 'Unit Level Design', slug: 'unit-level-design' },
  { id: 23, name: 'Project Level Design', slug: 'project-level-design' },
  { id: 27, name: 'ID Specifications', slug: 'id-specifications' },
  { id: 28, name: 'Common Area', slug: 'common-area' },
  { id: 29, name: 'Landscape & Amenities', slug: 'landscape-amenities' },
  { id: 30, name: 'Service Design Consideration', slug: 'service-design' },
  { id: 31, name: 'Contracting Strategy', slug: 'contracting-strategy' },
  { id: 32, name: 'Consultant Strategy', slug: 'consultant-strategy' },
  { id: 33, name: 'Phasing Plan', slug: 'phasing-plan' },
  { id: 34, name: 'Project Schedule', slug: 'project-schedule' },
  { id: 35, name: 'Approvals', slug: 'approvals' },
  { id: 36, name: 'Additional Project Details', slug: 'additional-details' },
  { id: 40, name: 'Export Configuration', slug: 'export-configuration' },
]

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default function DesignChaptersPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const department = user?.department || ''
  const canOpen = (id: number) => !department || department === 'super_admin' || (DEPARTMENT_CHAPTERS[department] || []).includes(id)

  useEffect(() => {
    ;(async () => {
      try {
        setProject((await getProject(projectId!)) ?? null)
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  if (loading) return <PageLoader />

  const type = project?.projectType ? project.projectType.charAt(0).toUpperCase() + project.projectType.slice(1) : 'Residential'
  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-900">
          {project?.name || 'Project Name'} - {type} Property
        </h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-8 border-b pb-4">Assigned Department</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {CHAPTERS.map((c) => {
            const allowed = canOpen(c.id)
            return (
              <div
                key={c.id}
                className={cn(
                  'bg-[#00509d] rounded-2xl shadow-lg p-8 flex flex-col items-center justify-between min-h-[220px] transition-all relative overflow-hidden',
                  allowed ? 'hover:scale-105 cursor-pointer' : 'opacity-60 grayscale-[0.5] cursor-not-allowed',
                )}
              >
                {!allowed && (
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-gray-900/10 flex items-center justify-center z-10">
                    <div className="bg-white/90 p-3 rounded-full shadow-lg">
                      <LockIcon />
                    </div>
                  </div>
                )}
                <h4 className="text-white text-center font-bold text-xl px-2">{c.name}</h4>
                <Button
                  disabled={!allowed}
                  className={cn(
                    'w-full bg-transparent border-2 border-white/50 text-white rounded-xl py-6 text-lg font-medium transition-all z-20',
                    allowed ? 'hover:bg-white hover:text-[#00509d]' : 'opacity-50',
                  )}
                  onClick={() => allowed && navigate(`/dashboard/project/${projectId}/design-chapters/${c.slug}`)}
                >
                  {allowed ? 'Enter Details' : 'Restricted Access'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
