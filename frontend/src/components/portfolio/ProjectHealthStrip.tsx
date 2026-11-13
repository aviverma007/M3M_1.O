/* Health, data completeness, last change and top problems for one project (top of its Modules page). */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Columns3, LayoutDashboard } from 'lucide-react'
import { getProjectHealth, type PortfolioProject } from '@/api/portfolio'
import { CompletenessBadge, HealthRing, ProblemList, StatusPill } from '@/components/portfolio/HealthBits'

export default function ProjectHealthStrip({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const [h, setH] = useState<PortfolioProject | null>(null)
  useEffect(() => {
    getProjectHealth(projectId)
      .then(setH)
      .catch(() => setH(null))
  }, [projectId])
  if (!h) return null
  const when = h.lastUpdate.at ? new Date(h.lastUpdate.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : null
  return (
    <div className="mx-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center cmp-rise">
      <div className="flex items-center gap-4">
        <HealthRing score={h.health.score} status={h.health.status} size={72} stroke={7} />
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Project health</p>
          <StatusPill status={h.health.status} />
          <div className="flex flex-wrap gap-2">
            <CompletenessBadge pct={h.completeness.pct} missing={h.completeness.missing} />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 bg-slate-50 border border-slate-200 text-gray-600">
              {h.checks.ok}/{h.checks.total} within benchmark
            </span>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Top problems</p>
        <ProblemList problems={h.health.problems} limit={3} compact />
      </div>
      <div className="flex flex-col gap-2 items-stretch">
        {when && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Clock size={12} /> Last updated {when}
            {h.lastUpdate.by ? ` by ${h.lastUpdate.by}` : ''}
          </p>
        )}
        <button onClick={() => navigate('/dashboard/portfolio')} className="flex items-center justify-center gap-1.5 h-8 rounded-lg border border-blue-200 text-[#00509d] text-xs font-bold hover:bg-blue-50">
          <LayoutDashboard size={13} /> Portfolio overview
        </button>
        <button onClick={() => navigate(`/dashboard/project/${projectId}/comparison`)} className="flex items-center justify-center gap-1.5 h-8 rounded-lg border border-blue-200 text-[#00509d] text-xs font-bold hover:bg-blue-50">
          <Columns3 size={13} /> Compare
        </button>
      </div>
    </div>
  )
}
