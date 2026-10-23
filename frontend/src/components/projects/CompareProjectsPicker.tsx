/**
 * "Compare" project picker shown inside the compare dialog (original Zae + Kae + Xae + Nte):
 * project-type tab, reset / date / expanding search controls, infinite-scroll checkbox list.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, LoaderCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { http, type ApiEnvelope } from '@/api/http'
import { useProject } from '@/api/projects'
import { useDebounce } from './useDebounce'
import { resetIcon } from './icons'
import { cn } from '@/lib/utils'
import type { Paginated } from '@/types'

type LiteProject = { id: number; name: string; projectType: string }

export type CompareCheckboxHandler = (e: ChangeEvent<HTMLInputElement>, id: string) => void

type Props = {
  selectedProjects: Set<string>
  handleCheckboxChange: CompareCheckboxHandler
  currentProjectType?: string
}

export default function CompareProjectsPicker({ selectedProjects, handleCheckboxChange, currentProjectType }: Props) {
  const { projectId } = useParams()
  const { data: singleProject } = useProject(projectId)
  const type = currentProjectType ?? singleProject?.projectType ?? 'residential'

  const [all, setAll] = useState<LiteProject[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [date, setDate] = useState<Date | ''>('')
  const [searchText, setSearchText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const search = useDebounce(searchText, 500)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => setPage(1), [date, search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const day = date ? date.toISOString() : ''
    http
      .get<ApiEnvelope<Paginated<LiteProject>>>('/project', {
        params: { fromDate: day, toDate: day, projectType: type, limit: 10, page, search, fields: 'id,name,projectType' },
      })
      .then((res) => {
        if (cancelled) return
        const rows = res.data?.rows ?? []
        setAll((prev) => (page === 1 ? rows : [...prev, ...rows]))
        setHasMore(rows.length === 10)
      })
      .catch((e: Error) => !cancelled && setError(e.message || 'error'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [page, date, search, type])

  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleScroll = () => {
    clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const el = scrollRef.current
      if (!el || loading || !hasMore) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) setPage((p) => p + 1)
    }, 200)
  }

  const reset = () => {
    setDate('')
    setSearchText('')
    setExpanded(false)
  }

  const maxSelectable = projectId ? 2 : 3
  const list = (projectId ? all.filter((p) => p.id !== parseInt(projectId)) : all).slice().sort((a, b) => {
    const sa = selectedProjects.has(String(a.id))
    const sb = selectedProjects.has(String(b.id))
    return sa === sb ? 0 : sa ? -1 : 1
  })

  return (
    <div>
      <div className=" flex xs:flex-row flex-col w-full pt-10 pb-2 px-3 border-gray-300 border-b-2 gap-2 justify-between items-center">
        <div className="capitalize max-w-25 border-0 border-b-3  text-[var(--mainTheamColor)] border-[var(--mainTheamColor)] font-semibold">{type}</div>
        <div className="flex gap-2">
          <Button className="cursor-pointer px-2 m-0" variant="ghost" onClick={reset}>
            <img src={resetIcon} alt="" />
          </Button>
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(' justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                <CalendarIcon />
                <span className="sm:inline hidden">{date ? format(date, 'PPP') : <span>Select Date</span>}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 " align="start" forceMount>
              <Calendar
                mode="single"
                selected={date || undefined}
                onSelect={(d) => {
                  if (!d) return
                  const n = new Date(d)
                  n.setHours(5, 30, 0, 0)
                  setDate(n)
                }}
                autoFocus
                disabled={(d) => d > new Date() || d < new Date('1900-01-01')}
              />
            </PopoverContent>
          </Popover>
          <ExpandingSearch searchText={searchText} setSearchText={setSearchText} expanded={expanded} setExpanded={setExpanded} />
        </div>
      </div>

      {error ? (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2">Error fetching projects</div>
      ) : (
        <div>
          <div className="bg-blue-100 py-1 px-3">All Projects</div>
          <div className={cn('space-y-1 overflow-y-auto max-h-[215px]', loading && 'opacity-20')} ref={scrollRef} onScroll={handleScroll}>
            {list.map(({ id, name }, i) => {
              const key = String(id)
              const checked = selectedProjects.has(key)
              const disabled = !checked && selectedProjects.size >= maxSelectable
              return (
                <div key={i} className="space-x-2 py-2 px-3 border-b-1 border-gray-300 flex items-center">
                  <input id={key} type="checkbox" checked={checked} onChange={(e) => handleCheckboxChange(e, key)} disabled={disabled} className="w-5 h-5" />
                  <label htmlFor={key} className="cursor-pointer w-full text-sm">
                    {name}
                  </label>
                </div>
              )
            })}
            {loading && (
              <div className="animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2">
                <LoaderCircle />
              </div>
            )}
            {!hasMore && <div className="text-center text-xs text-green-700">All {all.length} projects loaded successfully</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function ExpandingSearch({
  searchText,
  setSearchText,
  expanded,
  setExpanded,
}: {
  searchText: string
  setSearchText: (v: string) => void
  expanded: boolean
  setExpanded: (v: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className=" flex items-center relative min-w-10">
      <div
        className={`flex items-center transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'w-40 h-8 px-2' : 'w-8 h-8 flex justify-center items-center'} bg-gray-200 rounded-full p-1 shadow-md`}
      >
        {expanded && (
          <div className="relative flex-grow">
            <input
              ref={ref}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onBlur={() => !searchText && setExpanded(false)}
              className="w-full bg-transparent outline-none px-2 text-sm"
              placeholder="        Search here..."
              autoFocus
            />
            {!searchText && (
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={15} />
              </div>
            )}
          </div>
        )}
        {!expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(true)
              setTimeout(() => ref.current?.focus(), 100)
            }}
            className=" p-2.5 rounded-full w-9 h-9 transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-300 flex justify-center items-center"
          >
            <Search />
          </button>
        )}
      </div>
    </div>
  )
}
