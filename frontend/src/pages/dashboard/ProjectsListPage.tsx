/**
 * /dashboard — "Existing Projects" list (original page-DTQzjkIr).
 * Filters are mirrored to the URL (?q,from,to,pt,pc,page,limit,lc) and to localStorage `prfilval`.
 * general_contributor users get the "My Tasks" dashboard instead.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { SmallLoader } from '@/components/common/PageLoader'
import NewProjectDialog, { useCanCreateProject } from '@/components/common/NewProjectDialog'
import { useProjects } from '@/api/projects'
import { useAuth } from '@/auth/AuthContext'
import { FILTER_KEY, getPortfolio, getSavedFilters } from '@/state/portfolio'
import ProjectFilters, { type ListFilters } from '@/components/projects/list/ProjectFilters'
import ProjectsTable from '@/components/projects/list/ProjectsTable'
import ProjectsPagination from '@/components/projects/list/ProjectsPagination'
import ContributorDashboard from '@/components/projects/list/ContributorDashboard'
import { useDebounce } from '@/components/projects/useDebounce'
import { searchIcon } from '@/components/projects/icons'

function initialFilters(): ListFilters {
  const q = new URLSearchParams(window.location.search)
  const saved = getSavedFilters<ListFilters>()
  return {
    search: q.get('q') || saved.search || '',
    from: q.get('from') || saved.from || '',
    to: q.get('to') || saved.to || '',
    projectType: q.get('pt') || saved.projectType || '',
    projectCategory: q.get('pc') || saved.projectCategory || '',
    page: q.get('page') || saved.page || '',
    limit: q.get('limit') || saved.limit || '',
    locationCategory: q.get('lc') || saved.locationCategory || getPortfolio() || '',
  }
}

const resetFilters = (): ListFilters => ({
  search: '',
  projectType: '',
  projectCategory: '',
  from: '',
  to: '',
  page: 1,
  limit: 10,
  locationCategory: getPortfolio() || '',
})

function SearchHeader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canCreate = useCanCreateProject()
  return (
    <div className="flex items-center justify-between pt-3 gap-2">
      <div className="flex gap-4 flex-col w-full">
        <div className="min-w-30 text-custom font-bold">Existing Projects</div>
        <div className="relative  lg:w-90 xs:w-70 w-full">
          <Input
            type="text"
            placeholder="Search Project Name & Category"
            className="placeholder:text-sm placeholder:truncate bg-white pr-10"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {!value && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 bg-transparent p-1">
              <img src={searchIcon} alt="" />
            </span>
          )}
        </div>
      </div>
      {canCreate && <NewProjectDialog className="xs:rounded-md rounded-full h-10 w-10 xs:w-35 bg-green-600 hover:bg-green-700" />}
    </div>
  )
}

function ProjectsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ListFilters>(initialFilters)
  const search = useDebounce(filters.search, 500)

  const { data, isFetching } = useProjects({
    search,
    projectType: filters.projectType,
    projectCategory: filters.projectCategory,
    from: filters.from,
    to: filters.to,
    page: Number(filters.page) || 1,
    limit: Number(filters.limit) || 10,
    locationCategory: filters.locationCategory,
  })
  const pagination = { page: data?.currentPage || 1, total: data?.count || 10, totalPages: data?.totalPages || 0 }

  // changing project type clears the category
  const [prevType, setPrevType] = useState(filters.projectType)
  if (prevType !== filters.projectType) {
    setPrevType(filters.projectType)
    if (filters.projectCategory) setFilters((f) => ({ ...f, projectCategory: '' }))
  }

  // out-of-range page -> back to page 1
  useEffect(() => {
    if (pagination.totalPages && Number(filters.page) > pagination.totalPages && pagination.totalPages > 0) setFilters((f) => ({ ...f, page: 1 }))
  }, [pagination.totalPages, filters.page])

  // mirror filters to URL + localStorage
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.search) p.set('q', filters.search)
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (filters.projectType) p.set('pt', filters.projectType)
    if (filters.projectCategory) p.set('pc', filters.projectCategory)
    if (filters.page) p.set('page', String(filters.page))
    if (filters.limit) p.set('limit', String(filters.limit))
    if (filters.locationCategory) p.set('lc', filters.locationCategory)
    navigate(`?${p.toString()}`, { replace: true })
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(filters))
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.projectType, filters.projectCategory, filters.from, filters.to, filters.page, filters.limit])

  const onReset = () => {
    try {
      localStorage.removeItem(FILTER_KEY)
    } catch {
      /* ignore */
    }
    setFilters(resetFilters())
    navigate('/dashboard?page=1&limit=10')
  }

  return (
    <div className="flex flex-col sm:px-2 px-0 grow gap-2 ">
      <SearchHeader value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v, page: 1 }))} />
      <ProjectFilters filters={filters} onFilterChange={(patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }))} handleResetFilters={onReset} />
      {isFetching ? (
        <div className="rounded-md border relative grow flex items-center justify-center min-h-[400px]">
          <SmallLoader />
        </div>
      ) : (
        <ProjectsTable data={data?.rows} page={pagination.page} limit={Number(filters.limit) || 0} />
      )}
      <ProjectsPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages || 1}
        totalItems={pagination.total}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        onLimitChange={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
      />
    </div>
  )
}

export default function ProjectsListPage() {
  const { user } = useAuth()
  return user?.role === 'general_contributor' ? <ContributorDashboard /> : <ProjectsList />
}
