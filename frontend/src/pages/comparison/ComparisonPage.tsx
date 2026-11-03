/**
 * Module 21 "Comparison": /dashboard/project/:projectId/comparison?b=<id>
 * Two project dropdowns; everything compared side by side (management view) with morphing values and bars;
 * "Download PDF" exports the same comparison in the DPR format (POST /comparison/pdf).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, ChevronLeft, FileDown, LoaderCircle, MapPin, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { barShare, buildComparison, fmtNum, type CompareInput, type CompareRow, type Comparison } from '@/lib/projectComparison'
import { downloadComparisonPdf, getComparisonPair, getComparisonProjects, lastCompared, rememberCompared, type ProjectOption } from '@/api/comparison'

const A_CLR = '#1A3566'
const B_CLR = '#5B8FC7'

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

function Bar({ share, color, dir }: { share: number; color: string; dir: 'left' | 'right' }) {
  return (
    <div className={cn('h-2 rounded-full bg-slate-100 overflow-hidden flex', dir === 'left' ? 'justify-end' : 'justify-start')}>
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
  const [a, setA] = useState(projectId)
  const [b, setB] = useState(params.get('b') || lastCompared(projectId))
  const [pair, setPair] = useState<{ a: CompareInput; b: CompareInput } | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    getComparisonProjects()
      .then(setProjects)
      .catch((e) => {
        console.error('Error fetching projects', e)
        toast.error('Failed to load projects')
      })
  }, [])

  useEffect(() => {
    if (!a || !b) return
    if (a === b) {
      toast.error('Select two different projects')
      return
    }
    setLoading(true)
    rememberCompared(projectId, b)
    setParams((p) => {
      p.set('b', b)
      return p
    }, { replace: true })
    getComparisonPair(a, b)
      .then(setPair)
      .catch((e) => {
        console.error('Error loading comparison', e)
        toast.error('Failed to load the comparison')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b])

  const cmp = useMemo<Comparison | null>(() => (pair ? buildComparison(pair.a, pair.b) : null), [pair])

  const swap = () => {
    if (!a || !b) return
    setA(b)
    setB(a)
  }
  const download = async () => {
    if (!a || !b || a === b) return
    setDownloading(true)
    try {
      const blob = await downloadComparisonPdf(a, b)
      downloadBlob(blob, `Comparison_${cmp?.a.name ?? a}_vs_${cmp?.b.name ?? b}.pdf`.replace(/[^a-z0-9_.]+/gi, '_'))
    } catch (e) {
      console.error('Error downloading comparison PDF', e)
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }
  const jump = (key: string) => {
    setActive(key)
    document.getElementById(`cmp-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 w-full">
      {/* header */}
      <div className="w-full bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-[#00509d] hover:bg-[#00509d] hover:text-white transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Comparison</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Module 21 · Management comparison of two projects</p>
        </div>
        <Button
          onClick={download}
          disabled={!cmp || downloading || loading}
          className="bg-[#4caf50] hover:bg-[#43a047] text-white gap-2 h-10 px-5 text-sm font-bold rounded-lg shadow-sm border-none"
        >
          {downloading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown size={16} />}
          Download PDF
        </Button>
      </div>

      {/* selectors */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
        <ProjectPicker label="Project A" color={A_CLR} value={a} onChange={setA} projects={projects} exclude={b} />
        <div className="flex flex-col items-center gap-2 pb-0.5">
          <div key={`${a}-${b}`} className="cmp-vs w-12 h-12 rounded-full bg-[#1A3566] text-white font-black flex items-center justify-center shadow-md ring-4 ring-[#A8C8E8]/50">
            VS
          </div>
          <button onClick={swap} disabled={!a || !b} className="text-[11px] font-bold text-[#00509d] flex items-center gap-1 hover:underline disabled:opacity-40" title="Swap projects">
            <ArrowLeftRight size={12} /> Swap
          </button>
        </div>
        <ProjectPicker label="Project B" color={B_CLR} value={b} onChange={setB} projects={projects} exclude={a} />
      </div>

      {!b && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center cmp-rise">
          <p className="text-lg font-bold text-gray-700">Select a project to compare with</p>
          <p className="text-sm text-gray-400 mt-1">Choose Project B above to see both projects side by side.</p>
        </div>
      )}

      {b && !cmp && loading && (
        <div className="flex justify-center p-20">
          <LoaderCircle className="w-8 h-8 animate-spin text-[#00509d]" />
        </div>
      )}

      {cmp && (
        <div className={cn('space-y-6 transition-opacity duration-300', loading && 'opacity-60')}>
          {/* hero cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Hero p={cmp.a} tag="Project A" gradient="linear-gradient(120deg,#091D4A 0%,#1A3D88 55%,#2A55A8 100%)" />
            <Hero p={cmp.b} tag="Project B" gradient="linear-gradient(120deg,#2A55A8 0%,#4A7CC0 55%,#7AA6D8 100%)" />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cmp.kpis.map((k, i) => {
              const s = barShare(k.an, k.bn)
              return (
                <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cmp-rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center">
                    {k.label}
                    {k.unit ? ` (${k.unit})` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="text-right">
                      <Morph text={k.a} n={k.an} className="text-xl font-black text-[#1A3566]" />
                      <div className="mt-2">
                        <Bar share={s.a} color={A_CLR} dir="left" />
                      </div>
                    </div>
                    <div>
                      <Morph text={k.b} n={k.bn} className="text-xl font-black text-[#5B8FC7]" />
                      <div className="mt-2">
                        <Bar share={s.b} color={B_CLR} dir="right" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* scorecard */}
          <Scorecard cmp={cmp} />

          {/* section chips */}
          <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-[#f8fafc]/90 backdrop-blur flex flex-wrap gap-2">
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
          </div>

          {/* sections */}
          {cmp.sections.map((s) => (
            <div key={s.key} id={`cmp-${s.key}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-16 cmp-rise">
              <div className="bg-[#00509d] text-white px-6 py-3 grid grid-cols-[1fr_minmax(180px,1.1fr)_1fr] items-center gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-right truncate">{cmp.a.name}</span>
                <span className="text-sm font-black text-center">{s.title}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider truncate">{cmp.b.name}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {s.rows.map((r) => (
                  <RowView key={r.label} r={r} cmp={cmp} />
                ))}
              </div>
            </div>
          ))}

          <p className="text-[11px] text-gray-400 text-center pb-8">
            "Better" is marked only where a direction is defined (efficiency, cost, parking, delivery). Values come from each project&apos;s modules; "-" means not entered.
          </p>
        </div>
      )}
    </div>
  )
}

function ProjectPicker({ label, color, value, onChange, projects, exclude }: { label: string; color: string; value: string; onChange: (v: string) => void; projects: ProjectOption[]; exclude: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 data-[size=default]:h-11 w-full bg-white border-2 rounded-xl text-sm font-semibold" style={{ borderColor: `${color}55` }}>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent className="bg-white max-h-80">
          {projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)} disabled={String(p.id) === exclude} className="text-sm">
              <span className="font-semibold">{p.name}</span>
              {p.location && <span className="text-gray-400 ml-2 text-xs">{p.location}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Hero({ p, tag, gradient }: { p: Comparison['a']; tag: string; gradient: string }) {
  const meta = [p.projectType, p.category, p.portfolio, p.classification].filter(Boolean)
  return (
    <div className="relative rounded-2xl p-6 text-white shadow-md overflow-hidden min-h-[150px]" style={{ background: gradient }}>
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute right-10 bottom-[-40px] w-28 h-28 rounded-full bg-white/5" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8C8E8]">{tag}</p>
      <h2 className="text-2xl font-black mt-1">
        <span key={p.id} className="cmp-morph">
          {p.name}
        </span>
      </h2>
      <p className="text-sm text-white/85 mt-1">
        <span key={`l${p.id}`} className="cmp-morph items-center gap-1 !inline-flex">
          <MapPin size={13} /> {p.location || '-'}
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {meta.map((m) => (
          <span key={m} className="cmp-morph text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/20 rounded-full px-2.5 py-1">
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

function Scorecard({ cmp }: { cmp: Comparison }) {
  const { a, b, tie, measured } = cmp.score
  const total = Math.max(1, a + b + tie)
  const lead = a === b ? 'Both projects are level on benchmarked parameters' : `${a > b ? cmp.a.name : cmp.b.name} leads on ${Math.max(a, b)} of ${measured} benchmarked parameters`
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
            <div className="h-full transition-[width] duration-700 ease-out bg-white" style={{ width: `${(a / total) * 100}%` }} />
            <div className="h-full transition-[width] duration-700 ease-out bg-white/30" style={{ width: `${(tie / total) * 100}%` }} />
            <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${(b / total) * 100}%`, background: '#7AA6D8' }} />
          </div>
          <p className="text-[11px] text-[#A8C8E8] mt-2">Efficiency, cost, parking and delivery parameters where a better value is defined: {measured}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <Count n={a} label={`${cmp.a.name} better`} color="#1A3566" />
          <Count n={b} label={`${cmp.b.name} better`} color="#5B8FC7" />
          <Count n={tie} label="Equal" color="#6B7280" />
        </div>
      </div>
    </div>
  )
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3 w-[120px] text-center">
      <span style={{ color }}>
        <Morph text={String(n)} n={n} className="text-3xl font-black" />
      </span>
      <p className="text-[10px] font-bold text-gray-500 mt-1 truncate" title={label} style={{ color }}>
        {label}
      </p>
    </div>
  )
}

function RowView({ r, cmp }: { r: CompareRow; cmp: Comparison }) {
  const s = barShare(r.an, r.bn)
  const numeric = r.an !== null && r.bn !== null
  const d = numeric ? r.bn! - r.an! : null
  const same = !numeric && r.a !== '-' && r.a.toLowerCase() === r.b.toLowerCase()
  const note = numeric
    ? d === 0
      ? 'No difference'
      : `${d! > 0 ? '+' : '−'}${fmtNum(Math.abs(d!))}${r.deltaPct !== null ? ` (${d! > 0 ? '+' : '−'}${Math.abs(r.deltaPct).toFixed(1)}%)` : ''}`
    : same
      ? 'Same'
      : r.a === '-' || r.b === '-'
        ? `Only ${r.a === '-' ? cmp.b.name : cmp.a.name} has data`
        : 'Different'
  const side = (v: string, n: number | null, share: number, win: boolean, color: string, dir: 'left' | 'right') => (
    <div className={cn('min-w-0', dir === 'left' ? 'text-right' : 'text-left')}>
      <div className={cn('flex items-center gap-2', dir === 'left' ? 'justify-end' : 'justify-start')}>
        {win && dir === 'left' && <BetterPill />}
        <Morph text={v} n={numeric ? n : null} className={cn('text-[15px] font-bold truncate', win ? 'text-green-600' : 'text-gray-800')} />
        {win && dir === 'right' && <BetterPill />}
      </div>
      {numeric && (
        <div className="mt-1.5">
          <Bar share={share} color={color} dir={dir} />
        </div>
      )}
    </div>
  )
  return (
    <div className="px-6 py-3.5 grid grid-cols-[1fr_minmax(180px,1.1fr)_1fr] items-center gap-4 hover:bg-slate-50/70 transition-colors">
      {side(r.a, r.an, s.a, r.winner === 'a', A_CLR, 'left')}
      <div className="text-center">
        <p className="text-[12px] font-bold text-gray-700">
          {r.label}
          {r.unit && <span className="font-medium text-gray-400"> ({r.unit})</span>}
        </p>
        <p className={cn('text-[10px] mt-0.5 font-semibold', same || r.winner === 'tie' ? 'text-green-600' : 'text-gray-400')}>{r.winner === 'tie' ? 'Equal' : note}</p>
      </div>
      {side(r.b, r.bn, s.b, r.winner === 'b', B_CLR, 'right')}
    </div>
  )
}

function BetterPill() {
  return <span className="cmp-morph shrink-0 text-[9px] font-black uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-2 py-0.5">Better</span>
}
