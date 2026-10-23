/** Dashboard shown to general_contributor users: summary cards + "My Tasks" table (original `$e`). */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SmallLoader } from '@/components/common/PageLoader'
import { http, type ApiEnvelope } from '@/api/http'
import ProjectFilters, { type ListFilters } from './ProjectFilters'
import { useDebounce } from '../useDebounce'
import type { ContributorTask } from '@/types/projects'

const EMPTY: ListFilters = { search: '', from: '', to: '', projectType: '', projectCategory: '', page: 1, limit: 10 }
const DONE = ['Completed', 'Submitted', 'Approved']

const deptSlug = (d?: string) => {
  switch (d) {
    case 'Liaison':
      return 'liaison'
    case 'Business Development':
      return 'business-development'
    case 'Land':
      return 'land'
    case 'Structure':
      return 'structure'
    case 'MEP':
      return 'mep'
    default:
      return d ? d.toLowerCase().replace(/ /g, '-') : ''
  }
}

function SummaryCard({ title, count, subtitle, iconContainerClass }: { title: string; count: number; subtitle: string; iconContainerClass: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-600 font-semibold text-sm">{title}</h3>
        <div className={`p-1.5 rounded-md ${iconContainerClass}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
      </div>
      <div>
        <h2 className="text-4xl font-bold mb-2 text-gray-900">{count}</h2>
        <p className="text-xs font-semibold text-[#1aba58] flex items-center">
          {subtitle.includes('from last month') || subtitle.includes('completion rate') ? <span className="mr-1">↑</span> : null}
          {subtitle}
        </p>
      </div>
    </div>
  )
}

const STATUS_CLASS: Record<string, string> = {
  Assigned: 'border-blue-200 text-[#1e40af] bg-[#eff6ff]',
  'In Progress': 'border-green-200 text-[#15803d] bg-[#f0fdf4]',
  Pending: 'border-orange-200 text-[#c2410c] bg-[#fff7ed]',
  Completed: 'border-emerald-200 text-[#047857] bg-[#ecfdf5]',
  Submitted: 'border-blue-200 text-[#1e40af] bg-[#eff6ff]',
  Approved: 'border-emerald-200 text-[#047857] bg-[#ecfdf5]',
  Rejected: 'border-rose-200 text-[#be123c] bg-[#fff1f2]',
}
function StatusBadge({ status }: { status?: string }) {
  const s = status || 'Pending'
  return <span className={`px-3 py-1 rounded-sm text-xs font-bold border ${STATUS_CLASS[s] ?? 'border-gray-200 text-gray-700 bg-gray-50'}`}>{s}</span>
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')

function MyTasks({
  filters,
  setFilters,
  onReset,
  tasks,
}: {
  filters: ListFilters
  setFilters: (f: (p: ListFilters) => ListFilters) => void
  onReset: () => void
  tasks: ContributorTask[]
}) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
        <p className="text-gray-500 text-sm mb-4">Manage your assigned department inputs</p>
        <ProjectFilters filters={filters} onFilterChange={(patch) => setFilters((p) => ({ ...p, ...patch }))} handleResetFilters={onReset} />
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm text-left line-height-tight">
            <thead className="text-xs text-white uppercase bg-[#005db3]">
              <tr>
                {['S.NO', 'PROJECT NAME', 'ASSIGNED BY', 'DATE', 'STATUS', 'ACTION'].map((h) => (
                  <th key={h} scope="col" className="px-6 py-4 font-semibold tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.length > 0 ? (
                tasks.map((t, i) => (
                  <tr key={t.internalTaskId || i} className="bg-white hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{i + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      <div className="flex flex-col">
                        <span>
                          <span className="font-bold text-blue-700">{t.department}</span> - {t.name}
                        </span>
                        <span className="text-xs text-gray-500 capitalize mt-1">{t.projectType} Property</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{t.assignedBy || 'Admin'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs">
                        <span className="text-gray-900 font-medium">{fmtDate(t.date || t.createdAt)}</span>
                        {t.deadline && (
                          <span className="text-gray-400 mt-0.5">
                            {new Date(t.deadline) < new Date() ? <span className="text-red-500 font-bold">Overdue</span> : 'On Schedule'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        onClick={() => navigate(`/dashboard/project/${t.id}/design-brief/${deptSlug(t.department)}`)}
                        className="bg-[#005db3] hover:bg-[#004e98] text-white px-6 h-8 rounded text-xs font-semibold cursor-pointer"
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-white">
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No tasks found assigned to you.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ContributorDashboard() {
  const [tasks, setTasks] = useState<ContributorTask[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'myTasks'>('dashboard')
  const [filters, setFilters] = useState<ListFilters>(EMPTY)
  const search = useDebounce(filters.search, 500)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<ApiEnvelope<{ rows: ContributorTask[] }>>('/project/contributor/tasks')
      .then((res) => {
        const rows = res?.data?.rows || []
        const q = search.toLowerCase()
        const filtered = q
          ? rows.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.department || '').toLowerCase().includes(q) || (t.projectType || '').toLowerCase().includes(q))
          : rows
        if (!cancelled) setTasks(filtered)
      })
      .catch(() => !cancelled && setTasks([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [search])

  const tabClass = (active: boolean) =>
    `pb-3 px-1 font-medium transition-colors border-b-2 ${active ? 'text-black border-blue-600 font-semibold' : 'text-gray-500 border-transparent hover:text-black'}`

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)]">
      <div className="bg-white px-6 pt-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-8">
            <button onClick={() => setTab('dashboard')} className={tabClass(tab === 'dashboard')}>
              Dashboard
            </button>
            <button onClick={() => setTab('myTasks')} className={tabClass(tab === 'myTasks')}>
              My Tasks
            </button>
          </div>
          {tab === 'myTasks' && (
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search projects..."
                className="pl-8 pr-4 py-1.5 border border-blue-300 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-4 bg-transparent relative min-h-[400px]">
        {loading ? (
          <SmallLoader />
        ) : tab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Total Tasks" count={tasks.length} subtitle="12% from last month" iconContainerClass="bg-[#e6f8ec] text-[#1aba58]" />
            <SummaryCard title="Completed" count={tasks.filter((t) => DONE.includes(t.status)).length} subtitle="20% completion rate" iconContainerClass="bg-[#e6f8ec] text-[#1aba58]" />
            <SummaryCard title="Pending Tasks" count={tasks.filter((t) => !DONE.includes(t.status)).length} subtitle="Requires attention" iconContainerClass="bg-[#e6f8ec] text-[#1aba58]" />
            <SummaryCard title="Missed SLA" count={0} subtitle="Action Required" iconContainerClass="bg-[#e6f8ec] text-[#1aba58]" />
          </div>
        ) : (
          <MyTasks filters={filters} setFilters={setFilters} onReset={() => setFilters(EMPTY)} tasks={tasks} />
        )}
      </div>
    </div>
  )
}
