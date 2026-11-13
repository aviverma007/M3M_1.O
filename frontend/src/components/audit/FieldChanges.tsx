/* Value changes: who changed which field, from what, to what (Audit Logs › "Value changes"). */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, History, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { exportFieldChanges, fetchFieldChanges, type FieldChange } from '@/api/admin'
import { moduleLink } from '@/components/portfolio/links'

const PAGE_SIZE = 25
const ALL = 'all'

/** the field's own name (last part of "Key Ratio Inputs › Saleable Area"), used to scroll to it */
const fieldName = (label: string) => label.split('›').pop()!.replace(/\((remark|other)\)$/, '').trim()

const numeric = (v: string | null) => (v !== null && v.trim() !== '' && Number.isFinite(Number(v.replace(/,/g, ''))) ? Number(v.replace(/,/g, '')) : null)
function delta(c: FieldChange) {
  const a = numeric(c.oldValue)
  const b = numeric(c.newValue)
  if (a === null || b === null || a === b) return null
  const d = b - a
  const pct = a !== 0 ? (d / Math.abs(a)) * 100 : null
  const fmt = (x: number) => x.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return { up: d > 0, text: `${d > 0 ? '+' : ''}${fmt(d)}${pct !== null && Math.abs(pct) < 100000 ? ` (${d > 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}` }
}

function Value({ v, tone }: { v: string | null; tone: 'old' | 'new' }) {
  if (v === null) return <span className="text-gray-300 italic text-xs">empty</span>
  return (
    <span
      title={v}
      className={cn(
        'inline-block max-w-[220px] truncate align-middle rounded-md px-2 py-0.5 text-xs font-semibold',
        tone === 'old' ? 'bg-red-50 text-red-700 line-through decoration-red-300' : 'bg-green-50 text-green-700',
      )}
    >
      {v}
    </span>
  )
}

export default function FieldChanges({ projectId, projectName, onClearProject }: { projectId?: string; projectName?: string; onClearProject?: () => void }) {
  const [search, setSearch] = useState('')
  const [module, setModule] = useState(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [field, setField] = useState<{ path: string; label: string } | null>(null)
  const [page, setPage] = useState(1)

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (projectId) f.projectId = projectId
    if (search) f.search = search
    if (module !== ALL) f.module = module
    if (from) f.fromDate = from
    if (to) f.toDate = to
    if (field) f.path = field.path
    return f
  }, [projectId, search, module, from, to, field])
  const params = { page: String(page), limit: String(PAGE_SIZE), ...filters }
  const { data, isFetching, error } = useQuery({ queryKey: ['field-changes', params], queryFn: () => fetchFieldChanges(params) })
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const set = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  const exportCsv = async () => {
    try {
      downloadBlob(await exportFieldChanges(filters), 'value-changes.csv', 'text/csv')
    } catch (e) {
      console.error('export failed', e)
    }
  }
  const reset = () => {
    setSearch('')
    setModule(ALL)
    setFrom('')
    setTo('')
    setField(null)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {projectId && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00509d] bg-blue-50 border border-blue-100 rounded-full pl-3 pr-1.5 py-1">
            Project: {projectName}
            {onClearProject && (
              <button onClick={onClearProject} className="p-0.5 rounded-full hover:bg-blue-100" title="Show all projects">
                <X size={12} />
              </button>
            )}
          </span>
        )}
        {field && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-full pl-3 pr-1.5 py-1">
            <History size={12} /> History of: {field.label}
            <button onClick={() => set(setField)(null)} className="p-0.5 rounded-full hover:bg-violet-100" title="All fields">
              <X size={12} />
            </button>
          </span>
        )}
        <Button variant="outline" onClick={exportCsv} className="ml-auto text-blue-600 border-blue-600 hover:bg-blue-50 h-9">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm text-slate-700 font-medium mb-1.5 block px-1">Date range</label>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} className="h-10" aria-label="From" />
            <Input type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} className="h-10" aria-label="To" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-500 mb-1 block px-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Field, value, user or project…" className="pl-9 h-10" value={search} onChange={(e) => set(setSearch)(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-500 mb-1 block px-1">Module</label>
          <Select value={module} onValueChange={set(setModule)}>
            <SelectTrigger className="h-10 data-[size=default]:h-10">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modules</SelectItem>
              {(data?.modules ?? []).map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="ghost" className="h-10 text-gray-600" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-white uppercase bg-[#005baa]">
            <tr>
              <th className="px-4 py-3.5 font-medium">Date &amp; time</th>
              <th className="px-4 py-3.5 font-medium">Changed by</th>
              {!projectId && <th className="px-4 py-3.5 font-medium">Project</th>}
              <th className="px-4 py-3.5 font-medium">Module</th>
              <th className="px-4 py-3.5 font-medium">Field</th>
              <th className="px-4 py-3.5 font-medium">Old value</th>
              <th className="px-1 py-3.5" />
              <th className="px-4 py-3.5 font-medium">New value</th>
              <th className="px-4 py-3.5 font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {error ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-amber-700">
                  {(error as { message?: string }).message ?? 'Could not load the change history.'}
                </td>
              </tr>
            ) : isFetching && !rows.length ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Loading changes…
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No value changes recorded{projectId ? ' for this project' : ''} yet. Changes are recorded from now on, every time a value is saved.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const d = delta(c)
                return (
                  <tr key={c.id} className={cn('hover:bg-gray-50', isFetching && 'opacity-60')}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{format(new Date(c.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{c.userName || 'System'}</td>
                    {!projectId && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.projectId ? (
                          <Link to={`/dashboard/project/${c.projectId}/modules`} className="hover:text-[#00509d] hover:underline">
                            {c.projectName ?? `#${c.projectId}`}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.projectId ? (
                        <Link to={moduleLink(c.projectId, c.module, fieldName(c.label))} className="inline-flex items-center gap-1 hover:text-[#00509d] hover:underline" title="Open this field">
                          {c.module} <ArrowUpRight size={12} className="opacity-50" />
                        </Link>
                      ) : (
                        c.module
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <button
                        onClick={() => {
                          setField({ path: c.path, label: c.label })
                          setPage(1)
                        }}
                        className="text-left hover:text-[#00509d] hover:underline"
                        title="Show every change to this field"
                      >
                        {c.label}
                      </button>
                      {c.action !== 'update' && (
                        <span className={cn('ml-2 text-[10px] font-bold uppercase rounded px-1.5 py-0.5', c.action === 'create' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600')}>
                          {c.action === 'create' ? 'first entry' : 'removed'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Value v={c.oldValue} tone="old" />
                    </td>
                    <td className="px-1 py-3 text-gray-300">
                      <ArrowRight size={14} />
                    </td>
                    <td className="px-4 py-3">
                      <Value v={c.newValue} tone="new" />
                    </td>
                    <td className={cn('px-4 py-3 whitespace-nowrap text-xs font-bold', d ? (d.up ? 'text-green-700' : 'text-red-600') : 'text-gray-300')}>{d?.text ?? '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString('en-IN')} changes` : ''}
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isFetching}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-500 px-2">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isFetching}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
