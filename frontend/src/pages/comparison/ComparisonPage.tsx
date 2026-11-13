/**
 * Module 21 "Comparison": /dashboard/project/:projectId/comparison?ids=1,2,3   (old links: ?b=<id>)
 * 2–5 projects side by side (management view) with morphing values and bars, the portfolio reference for every row
 * (average, best project), an efficiency radar, saved comparison sets and a PDF in the DPR format.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bookmark, ChevronLeft, FileDown, LoaderCircle, MapPin, Plus, Save, Trash2, Trophy, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { barShares, buildComparison, fmtNum, type CompareInput, type CompareRow, type Comparison, type RowStat } from '@/lib/projectComparison'
import {
  deleteComparisonSet,
  downloadComparisonPdf,
  getComparisonInputs,
  getComparisonProjects,
  getComparisonSets,
  getPortfolioRef,
  lastCompared,
  rememberCompared,
  saveComparisonSet,
  type ComparisonSet,
  type PortfolioRef,
  type ProjectOption,
} from '@/api/comparison'
import { getProjectHealth, type PortfolioProject } from '@/api/portfolio'
import { HealthRing, StatusPill } from '@/components/portfolio/HealthBits'

/** one colour per project slot (same as the PDF) */
const SLOT = ['#1A3566', '#5B8FC7', '#0E7490', '#B45309', '#7C3AED']
const MAX = 5

/* ------------------------------------------------------------------ morph primitives */
/** number that glides from its previous value to the new one */
function useTween(target: number | null, ms = 750) {
  const [v, setV] = useState<number | null>(target)
  const from = useRef<number | null>(target)
  useEffect(() => {
    if (target === null) {
      from.current = null
      setV(null)
      return
    }
    const start = from.current ?? 0
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const cur = start + (target - start) * e
      setV(cur)
      from.current = cur
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/** value that morphs: numbers count, text blurs into the new value */
function Morph({ text, n, className }: { text: string; n?: number | null; className?: string }) {
  const v = useTween(n ?? null)
  if (n !== null && n !== undefined && v !== null) {
    const dp = (text.split('.')[1] ?? '').replace(/[^0-9]/g, '').length
    const done = Math.abs(v - n) < 1e-9
    return <span className={className}>{done ? text : fmtNum(v, dp)}</span>
  }
  return (
    <span key={text} className={cn('cmp-morph', className)}>
      {text}
    </span>
  )
}

function Bar({ share, color }: { share: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.round(share * 100)}%`, background: color }} />
    </div>
  )
}

/* ------------------------------------------------------------------ page */
export default function ComparisonPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [ids, setIds] = useState<string[]>(() => {
    const fromUrl = (params.get('ids') ?? '').split(',').filter(Boolean)
    if (fromUrl.length) return fromUrl.slice(0, MAX)
    const b = params.get('b')
    if (b) return [projectId, b]
    const last = lastCompared(projectId)
    return (last.length ? (last.includes(projectId) ? last : [projectId, ...last]) : [projectId]).slice(0, MAX)
  })
  const [inputs, setInputs] = useState<CompareInput[] | null>(null)
  const [health, setHealth] = useState<Record<string, PortfolioProject>>({})
  const [ref, setRef] = useState<PortfolioRef | null>(null)
  const [refScope, setRefScope] = useState<string>('auto')
  const [sets, setSets] = useState<ComparisonSet[] | null>(null)
  const [setsError, setSetsError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [active, setActive] = useState('')
  const [saveName, setSaveName] = useState<string | null>(null)

  const valid = ids.filter((x, i) => x && ids.indexOf(x) === i)

  useEffect(() => {
    getComparisonProjects()
      .then(setProjects)
      .catch((e) => {
        console.error('Error fetching projects', e)
        toast.error('Failed to load projects')
      })
    loadSets()
  }, [])
  const loadSets = () =>
    getComparisonSets()
      .then((s) => {
        setSets(s)
        setSetsError('')
      })
      .catch((e) => {
        setSets([])
        setSetsError(String(e?.message ?? '').includes('08_comparison_sets') ? 'Saved comparisons need a one-time database update (08_comparison_sets.sql).' : '')
      })

  useEffect(() => {
    if (valid.length < 2) {
      setInputs(null)
      return
    }
    setLoading(true)
    rememberCompared(projectId, valid)
    setParams(
      (p) => {
        p.set('ids', valid.join(','))
        p.delete('b')
        return p
      },
      { replace: true },
    )
    getComparisonInputs(valid)
      .then(setInputs)
      .catch((e) => {
        console.error('Error loading comparison', e)
        toast.error('Failed to load the comparison')
      })
      .finally(() => setLoading(false))
    valid.forEach((id) => {
      if (!health[id])
        getProjectHealth(id)
          .then((h) => setHealth((m) => ({ ...m, [id]: h })))
          .catch(() => undefined)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid.join(',')])

  const cmp = useMemo<Comparison | null>(() => (inputs && inputs.length >= 2 ? buildComparison(...inputs) : null), [inputs])

  // portfolio reference: the projects' common portfolio, or all projects
  const autoScope = useMemo(() => {
    const ports = [...new Set((cmp?.heads ?? []).map((h) => h.portfolio).filter(Boolean))]
    return ports.length === 1 ? ports[0] : 'All'
  }, [cmp])
  const scope = refScope === 'auto' ? autoScope : refScope
  useEffect(() => {
    if (!cmp) return
    getPortfolioRef(scope)
      .then(setRef)
      .catch(() => setRef(null))
  }, [scope, cmp])

  const setSlot = (i: number, v: string) => setIds((cur) => cur.map((x, j) => (j === i ? v : x)))
  const removeSlot = (i: number) => setIds((cur) => cur.filter((_, j) => j !== i))
  const addSlot = (v: string) => setIds((cur) => (cur.length >= MAX ? cur : [...cur, v]))

  const download = async () => {
    if (valid.length < 2) return
    setDownloading(true)
    try {
      const blob = await downloadComparisonPdf(valid)
      downloadBlob(blob, `Comparison_${(cmp?.heads ?? []).map((h) => h.name).join('_vs_')}.pdf`.replace(/[^a-z0-9_.]+/gi, '_'))
    } catch (e) {
      console.error('Error downloading comparison PDF', e)
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }
  const save = async () => {
    const name = (saveName ?? '').trim()
    if (!name) return toast.error('Give the comparison a name')
    try {
      await saveComparisonSet(name, valid)
      toast.success(`Saved "${name}"`)
      setSaveName(null)
      loadSets()
    } catch (e) {
      toast.error(String((e as Error)?.message ?? 'Failed to save'))
    }
  }
  const removeSet = async (s: ComparisonSet) => {
    try {
      await deleteComparisonSet(s.id)
      loadSets()
    } catch {
      toast.error('Failed to delete')
    }
  }
  const jump = (key: string) => {
    setActive(key)
    document.getElementById(`cmp-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const nameOf = (id: string) => projects.find((p) => String(p.id) === id)?.name ?? `Project ${id}`

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 w-full">
      {/* header */}
      <div className="w-full bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-[#00509d] hover:bg-[#00509d] hover:text-white transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Comparison</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Module 21 · up to {MAX} projects side by side, against the portfolio</p>
        </div>
        <SavedSets sets={sets} error={setsError} onPick={(s) => setIds(s.projectIds.map(String).slice(0, MAX))} onDelete={removeSet} nameOf={nameOf} />
        {saveName === null ? (
          <Button variant="outline" onClick={() => setSaveName('')} disabled={valid.length < 2} className="h-10 gap-2 text-sm font-bold border-blue-200 text-[#00509d]">
            <Save size={15} /> Save
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => (e.key === 'Enter' ? save() : e.key === 'Escape' ? setSaveName(null) : undefined)}
              placeholder="e.g. Gurgaon premium projects"
              className="h-10 w-64 rounded-lg border border-blue-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <Button onClick={save} className="h-10 bg-[#00509d] hover:bg-[#003f7a] text-white text-sm font-bold">
              Save
            </Button>
            <button onClick={() => setSaveName(null)} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}
        <Button onClick={download} disabled={!cmp || downloading || loading} className="bg-[#4caf50] hover:bg-[#43a047] text-white gap-2 h-10 px-5 text-sm font-bold rounded-lg shadow-sm border-none">
          {downloading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown size={16} />}
          Download PDF
        </Button>
      </div>

      {/* project slots */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          {ids.map((id, i) => (
            <div key={i} className="flex items-end gap-3">
              {i > 0 && (
                <div key={`${valid.join(',')}-${i}`} className="cmp-vs w-9 h-9 mb-1 rounded-full bg-[#1A3566] text-white text-[11px] font-black flex items-center justify-center shadow ring-4 ring-[#A8C8E8]/40">
                  VS
                </div>
              )}
              <ProjectPicker label={`Project ${String.fromCharCode(65 + i)}`} color={SLOT[i]} value={id} onChange={(v) => setSlot(i, v)} projects={projects} exclude={ids.filter((_, j) => j !== i)} onRemove={ids.length > 1 ? () => removeSlot(i) : undefined} />
            </div>
          ))}
          {ids.length < MAX && <AddPicker projects={projects} exclude={ids} onAdd={addSlot} />}
        </div>
      </div>

      {valid.length < 2 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center cmp-rise">
          <p className="text-lg font-bold text-gray-700">Add a project to compare with</p>
          <p className="text-sm text-gray-400 mt-1">Pick 2 to {MAX} projects above, or open a saved comparison.</p>
        </div>
      )}
      {valid.length >= 2 && !cmp && loading && (
        <div className="flex justify-center p-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-[#00509d]" />
        </div>
      )}

      {cmp && (
        <div className={cn('space-y-6 transition-opacity duration-300', loading && 'opacity-60')}>
          {/* hero cards with health */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cmp.heads.length}, minmax(0, 1fr))` }}>
            {cmp.heads.map((h, i) => (
              <Hero key={i} p={h} tag={`Project ${String.fromCharCode(65 + i)}`} color={SLOT[i]} health={health[h.id]} compact={cmp.heads.length > 3} />
            ))}
          </div>

          {/* key figures + radar */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
              {cmp.kpis.map((k, ki) => {
                const s = barShares(k.nums)
                return (
                  <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cmp-rise" style={{ animationDelay: `${ki * 40}ms` }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {k.label}
                      {k.unit ? ` (${k.unit})` : ''}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {k.values.map((v, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <Bar share={s[i]} color={SLOT[i]} />
                          <Morph text={v} n={k.nums[i]} className="text-sm font-black min-w-[80px] text-right" />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#1A3566]">Efficiency profile</h2>
                <span className="text-[10px] text-gray-400">outer edge = best in {scope === 'All' ? 'portfolio' : scope}</span>
              </div>
              <Radar cmp={cmp} ref_={ref} health={health} />
            </div>
          </div>

          <Scorecard cmp={cmp} />

          {/* section chips + reference scope */}
          <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-[#f8fafc]/90 backdrop-blur flex flex-wrap items-center gap-2">
            {cmp.sections.map((s) => (
              <button
                key={s.key}
                onClick={() => jump(s.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors',
                  active === s.key ? 'bg-[#00509d] text-white border-[#00509d]' : 'bg-white text-[#00509d] border-blue-100 hover:bg-blue-50',
                )}
              >
                {s.title}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold text-gray-500">
              Reference
              <Select value={refScope} onValueChange={setRefScope}>
                <SelectTrigger className="h-8 data-[size=default]:h-8 text-[11px] bg-white w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="auto">{autoScope === 'All' ? 'All projects' : `${autoScope} (auto)`}</SelectItem>
                  <SelectItem value="All">All projects</SelectItem>
                  {['M3M Gurgaon', 'M3M Noida', 'Smartworld'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* sections */}
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="space-y-6" style={{ minWidth: cmp.heads.length > 3 ? 1100 : undefined }}>
              {cmp.sections.map((s) => (
                <div key={s.key} id={`cmp-${s.key}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-16 cmp-rise">
                  <div className="bg-[#00509d] text-white px-5 py-3 grid items-center gap-4" style={{ gridTemplateColumns: cols(cmp.heads.length) }}>
                    <span className="text-sm font-black">{s.title}</span>
                    {cmp.heads.map((h, i) => (
                      <span key={i} className="text-[11px] font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i === 0 ? '#fff' : SLOT[i] }} />
                        {h.name}
                      </span>
                    ))}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8C8E8]">{scope === 'All' ? 'Portfolio' : scope}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {s.rows.map((r) => (
                      <RowView key={r.label} r={r} n={cmp.heads.length} stat={ref?.rows[r.label]} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center pb-8">
            &quot;Best&quot; is marked only where a direction is defined (efficiency, cost, parking, delivery). The reference column is the average and best of{' '}
            {ref ? `${ref.projects} ${scope === 'All' ? '' : `${scope} `}projects` : 'the portfolio'} that have the figure; test/demo projects are left out. &quot;-&quot; means not entered.
          </p>
        </div>
      )}
    </div>
  )
}

const cols = (n: number) => `minmax(190px, 1.15fr) repeat(${n}, minmax(0, 1fr)) minmax(150px, 0.9fr)`

/* ------------------------------------------------------------------ pieces */
function ProjectPicker({ label, color, value, onChange, projects, exclude, onRemove }: { label: string; color: string; value: string; onChange: (v: string) => void; projects: ProjectOption[]; exclude: string[]; onRemove?: () => void }) {
  return (
    <div className="space-y-1.5 w-[230px]">
      <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        {label}
        {onRemove && (
          <button onClick={onRemove} className="ml-auto text-gray-300 hover:text-red-500" title="Remove">
            <X size={13} />
          </button>
        )}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 data-[size=default]:h-11 w-full bg-white border-2 rounded-xl text-sm font-semibold" style={{ borderColor: `${color}55` }}>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent className="bg-white max-h-80">
          {projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)} disabled={exclude.includes(String(p.id))} className="text-sm">
              <span className="font-semibold">{p.name}</span>
              {p.location && <span className="text-gray-400 ml-2 text-xs">{p.location}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function AddPicker({ projects, exclude, onAdd }: { projects: ProjectOption[]; exclude: string[]; onAdd: (v: string) => void }) {
  return (
    <div className="w-[200px]">
      <Select value="" onValueChange={onAdd}>
        <SelectTrigger className="h-11 data-[size=default]:h-11 w-full bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-bold text-[#00509d]">
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> Add project
          </span>
        </SelectTrigger>
        <SelectContent className="bg-white max-h-80">
          {projects
            .filter((p) => !exclude.includes(String(p.id)))
            .map((p) => (
              <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                <span className="font-semibold">{p.name}</span>
                {p.location && <span className="text-gray-400 ml-2 text-xs">{p.location}</span>}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SavedSets({ sets, error, onPick, onDelete, nameOf }: { sets: ComparisonSet[] | null; error: string; onPick: (s: ComparisonSet) => void; onDelete: (s: ComparisonSet) => void; nameOf: (id: string) => string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((o) => !o)} className="h-10 gap-2 text-sm font-bold border-blue-200 text-[#00509d]">
        <Bookmark size={15} /> Saved comparisons{sets?.length ? ` (${sets.length})` : ''}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-40 p-2 cmp-rise">
          {error && <p className="text-xs text-amber-700 p-3">{error}</p>}
          {!error && !sets?.length && <p className="text-xs text-gray-400 p-3">No saved comparisons yet. Pick projects and press Save.</p>}
          {sets?.map((s) => (
            <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 group">
              <button
                className="flex-1 text-left"
                onClick={() => {
                  onPick(s)
                  setOpen(false)
                }}
              >
                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{s.projectIds.map((id) => nameOf(String(id))).join(' · ')}</p>
                {s.creatorName && <p className="text-[10px] text-gray-400">saved by {s.creatorName}</p>}
              </button>
              <button onClick={() => onDelete(s)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Hero({ p, tag, color, health, compact }: { p: Comparison['heads'][number]; tag: string; color: string; health?: PortfolioProject; compact: boolean }) {
  const meta = [p.projectType, p.category, p.portfolio, p.classification].filter(Boolean)
  return (
    <div className="relative rounded-2xl p-5 text-white shadow-md overflow-hidden min-h-[150px]" style={{ background: `linear-gradient(125deg, ${color} 0%, ${color}D9 55%, ${color}99 100%)` }}>
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{tag}</p>
          <h2 className={cn('font-black mt-1 truncate', compact ? 'text-lg' : 'text-2xl')}>
            <span key={p.id} className="cmp-morph">
              {p.name}
            </span>
          </h2>
          <p className="text-sm text-white/85 mt-1 truncate">
            <span key={`l${p.id}`} className="cmp-morph items-center gap-1 !inline-flex">
              <MapPin size={13} /> {p.location || '-'}
            </span>
          </p>
        </div>
        {health && (
          <div className="bg-white rounded-full p-1 shadow cmp-morph" title="Health score">
            <HealthRing score={health.health.score} status={health.health.status} size={compact ? 44 : 54} stroke={5} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {meta.slice(0, compact ? 2 : 4).map((m) => (
          <span key={m} className="cmp-morph text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/20 rounded-full px-2.5 py-1">
            {m}
          </span>
        ))}
        {health && <StatusPill status={health.health.status} className="bg-white/90" />}
      </div>
    </div>
  )
}

function Scorecard({ cmp }: { cmp: Comparison }) {
  const { wins, tie, measured } = cmp.score
  const total = Math.max(1, wins.reduce((a, b) => a + b, 0) + tie)
  const max = Math.max(...wins)
  const top = cmp.heads.filter((_, i) => wins[i] === max)
  const lead = !measured
    ? 'No benchmarked rows to compare yet'
    : top.length > 1
      ? `${top.map((h) => h.name).join(' and ')} are level with ${max} best values each`
      : `${top[0].name} has the best value on ${max} of ${measured} benchmarked rows`
  return (
    <div className="rounded-2xl p-6 text-white shadow-md" style={{ background: '#1A3566' }}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A8C8E8] flex items-center gap-2">
            <Trophy size={14} /> Benchmark Scorecard
          </p>
          <p className="text-lg font-black mt-2">
            <span key={lead} className="cmp-morph">
              {lead}
            </span>
          </p>
          <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-white/10">
            {wins.map((w, i) => (
              <div key={i} className="h-full transition-[width] duration-700 ease-out" style={{ width: `${(w / total) * 100}%`, background: i === 0 ? '#FFFFFF' : SLOT[i] }} />
            ))}
            <div className="h-full transition-[width] duration-700 ease-out bg-white/30" style={{ width: `${(tie / total) * 100}%` }} />
          </div>
          <p className="text-[11px] text-[#A8C8E8] mt-2">Rows where a better value is defined (efficiency, cost, parking, delivery): {measured}</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {cmp.heads.map((h, i) => (
            <Count key={i} n={wins[i]} label={`${h.name} best`} color={SLOT[i]} />
          ))}
          <Count n={tie} label="All equal" color="#6B7280" />
        </div>
      </div>
    </div>
  )
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl px-3 py-3 w-[104px] text-center">
      <span style={{ color }}>
        <Morph text={String(n)} n={n} className="text-3xl font-black" />
      </span>
      <p className="text-[10px] font-bold mt-1 truncate" title={label} style={{ color }}>
        {label}
      </p>
    </div>
  )
}

function RowView({ r, n, stat }: { r: CompareRow; n: number; stat?: RowStat }) {
  const share = barShares(r.nums)
  const numeric = r.nums.filter((x) => x !== null).length >= 2
  const same = !numeric && r.values.every((v) => v !== '-' && v.toLowerCase() === r.values[0].toLowerCase())
  return (
    <div className="px-5 py-3 grid items-center gap-4 hover:bg-slate-50/70 transition-colors" style={{ gridTemplateColumns: cols(n) }}>
      <div>
        <p className="text-[12px] font-bold text-gray-700">
          {r.label}
          {r.unit && <span className="font-medium text-gray-400"> ({r.unit})</span>}
        </p>
        {(r.tie || same) && <p className="text-[10px] font-semibold text-green-600">All the same</p>}
        {n === 2 && r.deltaPct !== null && r.nums[0] !== r.nums[1] && (
          <p className="text-[10px] text-gray-400 font-semibold">
            B vs A {r.deltaPct > 0 ? '+' : '−'}
            {Math.abs(r.deltaPct).toFixed(1)}%
          </p>
        )}
      </div>
      {r.values.map((v, i) => {
        const win = r.best.includes(i)
        return (
          <div key={i} className="min-w-0">
            <div className="flex items-center gap-2">
              <Morph text={v} n={numeric ? r.nums[i] : null} className={cn('text-[14px] font-bold truncate', win ? 'text-green-600' : 'text-gray-800')} />
              {win && <span className="cmp-morph shrink-0 text-[9px] font-black uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-2 py-0.5">Best</span>}
            </div>
            {numeric && r.nums[i] !== null && (
              <div className="mt-1.5">
                <Bar share={share[i]} color={SLOT[i]} />
              </div>
            )}
          </div>
        )
      })}
      <div className="text-[11px] leading-snug">
        {stat ? (
          <>
            <p className="font-bold text-gray-700">avg {fmtNum(stat.avg, stat.avg < 10 ? 2 : stat.avg < 1000 ? 1 : 0)}</p>
            <p className={cn('truncate', stat.better ? 'text-green-700' : 'text-gray-500')} title={`${stat.better ? 'Best' : 'Highest'}: ${stat.best.name}`}>
              {stat.better ? 'best' : 'high'} {fmtNum(stat.best.v, 2)} · {stat.best.name}
            </p>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ radar */
const AXES: { label: string; row?: string; part?: 'benchmarks' | 'completeness' }[] = [
  { label: 'Carpet / Saleable', row: 'Carpet / Saleable' },
  { label: 'Saleable / FAR', row: 'Saleable / FAR' },
  { label: 'FAR use', row: 'FAR Utilisation' },
  { label: 'Parking / unit', row: 'Car Parks per Unit' },
  { label: 'Cost / sales', row: 'Construction Cost / Sales Value' },
  { label: 'Within benchmark', part: 'benchmarks' },
  { label: 'Data complete', part: 'completeness' },
]

function Radar({ cmp, ref_, health }: { cmp: Comparison; ref_: PortfolioRef | null; health: Record<string, PortfolioProject> }) {
  const rows = new Map(cmp.sections.flatMap((s) => s.rows).map((r) => [r.label, r]))
  const size = 300
  const c = size / 2
  const R = 105
  const k = AXES.length
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / k
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]
  }
  // 0..1 per axis: position between the portfolio's lowest and best value (or the % itself for benchmark / completeness)
  const score = (pi: number, ax: (typeof AXES)[number]): number | null => {
    if (ax.part) {
      const h = health[cmp.heads[pi].id]
      const v = h?.health.parts[ax.part]
      return v === null || v === undefined ? null : v / 100
    }
    const v = rows.get(ax.row!)?.nums[pi]
    const st = ref_?.rows[ax.row!]
    if (v === null || v === undefined || !st) return null
    if (st.best.v === st.low.v) return 0.5
    return Math.max(0, Math.min(1, (v - st.low.v) / (st.best.v - st.low.v)))
  }
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`-70 -12 ${size + 140} ${size + 24}`} className="w-full max-w-[440px]">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <polygon key={g} points={AXES.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="#E2E8F0" strokeWidth={1} />
        ))}
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, 1)
          const [lx, ly] = pt(i, 1.22)
          return (
            <g key={ax.label}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="#E2E8F0" />
              <text x={lx} y={ly} fontSize={9.5} fontWeight={700} fill="#64748B" textAnchor={Math.abs(lx - c) < 8 ? 'middle' : lx > c ? 'start' : 'end'} dominantBaseline="middle">
                {ax.label}
              </text>
            </g>
          )
        })}
        {cmp.heads.map((h, pi) => {
          const vals = AXES.map((ax) => score(pi, ax) ?? 0)
          return (
            <polygon
              key={`${h.id}-${pi}`}
              points={vals.map((v, i) => pt(i, v).join(',')).join(' ')}
              fill={SLOT[pi]}
              fillOpacity={0.12}
              stroke={SLOT[pi]}
              strokeWidth={2}
              strokeLinejoin="round"
              className="cmp-radar"
              style={{ transformOrigin: `${c}px ${c}px` }}
            />
          )
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-1">
        {cmp.heads.map((h, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
            <span className="w-3 h-1.5 rounded-full" style={{ background: SLOT[i] }} />
            {h.name}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">Axes missing a figure for a project are drawn at the centre for it.</p>
    </div>
  )
}
