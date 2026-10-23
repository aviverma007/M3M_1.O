import { Fragment, useEffect } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { Eye } from 'lucide-react'
import Header from './Header'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/data'
import { ErrorState } from '@/components/common'
import { useProject } from '@/api/projects'
import { useViewOnly } from '@/state/viewOnly'
import background from '@/assets/images/background.png'

/** Breadcrumb built from the URL, numeric segments folded into the previous one (as original). */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const named = parts.filter((s) => Number.isNaN(Number(s)))
  const ids = new Map<string, string>()
  parts.forEach((p, i) => {
    if (Number.isNaN(Number(p)) && parts[i + 1] && !Number.isNaN(Number(parts[i + 1]))) ids.set(p, parts[i + 1])
  })
  const hrefAt = (idx: number) => {
    let url = ''
    for (let c = 0; c <= idx; c++) {
      url += `/${named[c]}`
      if (ids.has(named[c])) url += `/${ids.get(named[c])}`
    }
    return url
  }
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex typo-basic-2">
        {named.map((s, i) => (
          <Fragment key={i}>
            <BreadcrumbItem>
              {i < named.length - 1 ? <Link to={hrefAt(i)}>{s.charAt(0).toUpperCase() + s.slice(1)}</Link> : <BreadcrumbPage>{s.charAt(0).toUpperCase() + s.slice(1)}</BreadcrumbPage>}
            </BreadcrumbItem>
            {i < named.length - 1 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/** White heading card with title, optional interior-design owner (chapter pages) and breadcrumbs. */
export function PageHeading({ heading, interiorDesignOwner }: { heading: string; interiorDesignOwner?: string | null }) {
  return (
    <div className="bg-white md:py-3 py-2 md:px-6 px-3 rounded-md border border-gray-100 shadow-sm mb-4">
      <div className=" md:space-y-2 space-y-0 flex md:flex-row flex-col justify-between md:items-center">
        <h1 className="capitalize text-headder">{heading}</h1>
        {interiorDesignOwner && (
          <div className="font-semibold text-sm text-nowrap">
            Interior Design Owner: <span className="font-normal capitalize text-stone-600 text-sm">{interiorDesignOwner}</span>
          </div>
        )}
      </div>
      <Breadcrumbs />
    </div>
  )
}

const HIDE_HEADING_SUFFIXES = ['landing', 'login', 'dashboard']

/** App shell for everything under /dashboard (same structure as original). */
export default function DashboardLayout() {
  const location = useLocation()
  const { projectId } = useParams()
  const { data: project, error } = useProject(projectId)
  const { isViewOnly, setViewOnly } = useViewOnly()
  const search = new URLSearchParams(location.search)
  const typeParam = search.get('projectType')
  const projectType = ['residential', 'commercial', 'mixed'].includes(typeParam ?? '') ? typeParam : 'residential'

  const showHeading = !HIDE_HEADING_SUFFIXES.some((s) => location.pathname.endsWith(s)) && !location.pathname.includes('/design-brief')

  // leaving module pages always clears view-only mode
  useEffect(() => {
    const p = location.pathname
    if (!(p.includes('/modules/') || p.includes('/design-chapters/') || p.includes('/design-brief') || p.includes('/concept'))) setViewOnly(false)
  }, [location.pathname, setViewOnly])

  const heading = location.pathname.endsWith('/project') ? `New Project - ${projectType ?? 'Residential'} Property` : `${project?.projectType ?? 'Residential'} Property`

  return (
    <div className="relative min-h-screen flex flex-col ">
      <Header />
      <div className="flex-1 px-2" style={{ backgroundImage: `url(${background})` }}>
        {showHeading && <PageHeading heading={heading} interiorDesignOwner={location.pathname.includes('/chapter') ? project?.interiorDesignOwner : null} />}
        {isViewOnly && (
          <div className="sticky top-0 z-50 flex items-center gap-2.5 px-5 py-2.5 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm font-semibold shadow-sm">
            <Eye size={15} className="shrink-0" />
            <span>View Only — you can browse this module but saving changes is disabled.</span>
          </div>
        )}
        {error && projectId ? (
          <ErrorState message={error.message} />
        ) : (
          <div className={isViewOnly ? 'view-only-content' : ''}>
            <Outlet />
          </div>
        )}
      </div>
      <div className=" bg-white content-center sticky px-2 w-full bottom-0 max-h-[54px]">
        <div className="p-3" />
      </div>
    </div>
  )
}
