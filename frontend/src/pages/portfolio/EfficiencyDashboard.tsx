/**
 * Project Design Efficiencies — management / HOD dashboard (Portfolio › Efficiency Dashboard).
 * The headings of the "PROJECT DESIGN EFFICIENCIES" sheet, side by side for every project, grouped by portfolio:
 * portfolio averages, outliers (red, like the sheet), best project per heading, a watch list, data coverage and
 * "How it's calculated" (formula + source module + status of every heading). Every cell opens the module it comes from.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Download,
  Gauge,
  Info,
  LayoutGrid,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { fmtIN } from '@/lib/format'
import { getEfficiency, type EffProject, type Efficiency } from '@/api/portfolio'
import { isOutlier, outOfRange, rankScore, rowStats, type EffRowMeta, type EffValue, type RowStats } from '@/lib/efficiency'
import { moduleLink } from '@/components/portfolio/links'

const BLUE = '#00509d'
const STATUS = {
  captured: { label: 'Captured', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  partial: { label: 'Partly captured', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: CircleDashed },
  missing: { label: 'Not captured', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
} as const
/** headline ratios on the cards at the top */
const HEADLINE = ['superFar', 'buaSuper', 'buaFar', 'balconyFar', 'subPct', 'steelPlanned']

const fmt = (r: EffRowMeta, v: EffValue) => (v === null ? '' : typeof v === 'number' ? fmtIN(v, r.dp ?? 2) : v)
const brand = (portfolio: string) => (/^m3m/i.test(portfolio) ? 'M3M' : /smart/i.test(portfolio) ? 'SMARTWORLD' : portfolio.toUpperCase())

type Tip = { x: number; y: number; body: React.ReactNode } | null

export default function EfficiencyDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<Efficiency | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandF, setBrandF] = useState('All')
  const [type, setType] = useState<'residential' | 'all'>('residential')
  const [hideTest, setHideTest] = useState(true)
  const [withData, setWithData] = useState(true)
  const [group, setGroup] = useState('all')
  const [view, setView] = useState<'matrix' | 'method'>('matrix')
  const [open, setOpen] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [tip, setTip] = useState<Tip>(null)
  // projects picked in the selector (empty = every project the filters allow); remembered in this browser
  const [picked, setPicked] = useState<number[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('eff-picked') ?? '[]')
      return Array.isArray(v) ? v.filter((x) => typeof x === 'number') : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('eff-picked', JSON.stringify(picked))
    } catch {
      /* storage unavailable */
    }
  }, [picked])

  const load = () => {
    setLoading(true)
    getEfficiency()
      .then(setData)
      .catch((e) => {
        console.error('Error loading efficiencies', e)
        toast.error('Failed to load the efficiency dashboard')
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const rows = data?.rows ?? []
  const brands = useMemo(() => ['All', ...[...new Set((data?.projects ?? []).map((p) => brand(p.portfolio)))].sort()], [data])

  /** projects in scope, grouped by portfolio (like the sheet's M3M / SMARTWORLD bands) */
  const candidates = useMemo(() => {
    const captured = rows.filter((r) => r.status !== 'missing')
    const filled = (p: EffProject) => captured.filter((r) => p.values[r.id] !== null).length
    return (data?.projects ?? [])
      .filter(
        (p) =>
          (brandF === 'All' || brand(p.portfolio) === brandF) &&
          (type === 'all' || p.projectType === type) &&
          (!hideTest || !p.isTest) &&
          (!withData || filled(p) >= 5),
      )
      .sort((a, b) => brand(a.portfolio).localeCompare(brand(b.portfolio)) || a.portfolio.localeCompare(b.portfolio) || a.name.localeCompare(b.name))
  }, [data, rows, brandF, type, hideTest, withData])
  const projects = useMemo(() => {
    const sel = candidates.filter((p) => picked.includes(p.id))
    return sel.length ? sel : candidates
  }, [candidates, picked])

  const bands = useMemo(() => {
    const out: { name: string; n: number }[] = []
    for (const p of projects) {
      const b = p.portfolio
      if (out.length && out[out.length - 1].name === b) out[out.length - 1].n++
      else out.push({ name: b, n: 1 })
    }
    return out
  }, [projects])

  const stats = useMemo(() => {
    const m: Record<string, RowStats> = {}
    for (const r of rows)
      m[r.id] = rowStats(
        r,
        projects.map((p) => ({ id: String(p.id), v: p.values[r.id] })),
      )
    return m
  }, [rows, projects])

  const coverage = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length
    const cells = rows.filter((r) => r.status !== 'missing').length * projects.length
    const filled = rows.filter((r) => r.status !== 'missing').reduce((a, r) => a + projects.filter((p) => p.values[r.id] !== null).length, 0)
    return {
      captured: by('captured'),
      partial: by('partial'),
      missing: by('missing'),
      total: rows.length,
      filledPct: cells ? (filled / cells) * 100 : 0,
    }
  }, [rows, projects])

  /** worst outliers first: how many standard deviations worse than the portfolio average */
  const watch = useMemo(() => {
    const out: { row: EffRowMeta; p: EffProject; v: number; avg: number; z: number }[] = []
    const seen = new Set<string>()
    for (const r of rows) {
      if (seen.has(r.label)) continue // the sheet repeats a few headings
      seen.add(r.label)
      const s = stats[r.id]
      for (const p of projects) {
        const v = p.values[r.id]
        if (typeof v !== 'number' || !isOutlier(r, s, v)) continue
        out.push({ row: r, p, v, avg: s.avg!, z: Math.abs(v - s.avg!) / (s.sd || 1) })
      }
    }
    return out.sort((a, b) => b.z - a.z)
  }, [rows, stats, projects])

  const entryErrors = useMemo(() => {
    const out: { row: EffRowMeta; p: EffProject; v: number }[] = []
    for (const r of rows) for (const p of projects) if (outOfRange(r, p.values[r.id])) out.push({ row: r, p, v: p.values[r.id] as number })
    return out
  }, [rows, projects])

  const shownRows = rows.filter((r) => group === 'all' || r.group === group)
  const go = (p: EffProject, r: EffRowMeta) => navigate(moduleLink(p.id, r.module, r.focus))

  const jumpTo = (rowId: string, projectId?: number) => {
    const r = rows.find((x) => x.id === rowId)
    if (!r) return
    setView('matrix')
    setGroup((g) => (g === 'all' || g === r.group ? g : 'all'))
    setOpen(rowId)
    const key = projectId ? `${rowId}:${projectId}` : rowId
    setFlash(key)
    setTimeout(() => document.getElementById(`eff-row-${rowId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    setTimeout(() => setFlash((f) => (f === key ? null : f)), 2600)
  }

  const exportCsv = () => {
    const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const head = ['Group', 'Heading', 'Unit', 'Status', 'Source', 'Formula', ...projects.map((p) => p.name), 'Portfolio average']
    const lines = rows.map((r) => {
      const g = data?.groups.find((x) => x.id === r.group)?.title ?? ''
      return [
        g,
        r.label,
        r.unit ?? '',
        STATUS[r.status].label,
        `${r.moduleNo} ${r.module}`,
        r.formula,
        ...projects.map((p) => fmt(r, p.values[r.id])),
        stats[r.id].avg === null ? '' : fmtIN(stats[r.id].avg!, r.dp ?? 2),
      ]
        .map(q)
        .join(',')
    })
    const blob = new Blob(['﻿' + [head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Project_Design_Efficiencies_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading && !data)
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-3 text-gray-400">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#00509d]" />
        <p className="text-xs font-semibold">Calculating efficiencies for every project…</p>
      </div>
    )
  if (!data) return null

  return (
    <div className="space-y-6" onMouseLeave={() => setTip(null)}>
      {/* ---------------------------------------------------------------- hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-30 rounded-2xl text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg, #003366 0%, #00509d 55%, #0a6fc2 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <motion.div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(250,204,21,.35), transparent 65%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative p-6 lg:p-7 flex flex-col xl:flex-row xl:items-end gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200 flex items-center gap-2">
              <Sparkles size={13} /> Management dashboard
            </p>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight mt-1">Project Design Efficiencies</h2>
            <p className="text-sm text-blue-100/90 mt-1 max-w-2xl">
              Every heading of the efficiencies sheet, calculated live from each project&apos;s modules. Red = worse than the portfolio by a wide
              margin, ★ = best. Click any value to open the module it comes from.
            </p>
            <div className="mt-4">
              <ProjectPicker candidates={candidates} picked={picked} setPicked={setPicked} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {brands.map((b) => (
                <Chip key={b} on={brandF === b} onClick={() => setBrandF(b)} dark>
                  {b === 'All' ? 'All portfolios' : b}
                </Chip>
              ))}
              <span className="w-px bg-white/20 mx-1" />
              <Chip on={type === 'residential'} onClick={() => setType('residential')} dark>
                Residential
              </Chip>
              <Chip on={type === 'all'} onClick={() => setType('all')} dark>
                All types
              </Chip>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-semibold text-blue-100">
              <Toggle on={hideTest} onChange={setHideTest} label="Hide test / demo projects" />
              <Toggle on={withData} onChange={setWithData} label="Only projects with data" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 xl:w-[420px] shrink-0">
            <HeroStat label="Projects compared" value={projects.length} />
            <HeroStat label="Headings calculated" value={coverage.captured + coverage.partial} suffix={` / ${coverage.total}`} />
            <HeroStat label="Data filled" value={coverage.filledPct} suffix="%" dp={0} />
          </div>
        </div>
      </motion.div>

      {!projects.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-500">No projects match these filters.</div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- headline ratios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {HEADLINE.map((id, i) => {
              const r = rows.find((x) => x.id === id)
              return r ? <HeadlineCard key={id} r={r} s={stats[id]} projects={projects} i={i} onOpen={() => jumpTo(id)} setTip={setTip} /> : null
            })}
          </div>

          {/* ---------------------------------------------------------------- watch list + coverage */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <PanelHead
                icon={<TrendingDown size={15} />}
                title="Watch list"
                hint="Headings where a project is far worse than the portfolio average (more than one standard deviation)"
                count={watch.length}
              />
              {!watch.length ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">Nothing stands out — every project is within the normal range.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                  {watch.slice(0, 30).map((w, i) => (
                    <motion.button
                      key={`${w.row.id}:${w.p.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + Math.min(i, 12) * 0.035 }}
                      onClick={() => jumpTo(w.row.id, w.p.id)}
                      className="w-full px-5 py-2.5 flex items-center gap-3 text-left hover:bg-rose-50/40 group"
                    >
                      <span
                        className="w-1.5 h-8 rounded-full bg-gradient-to-b from-rose-400 to-rose-600 shrink-0"
                        style={{ opacity: Math.min(1, 0.35 + w.z / 3) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-800 truncate">
                          {w.p.name} <span className="text-gray-400 font-semibold">· {w.row.label}</span>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          <span className="font-black text-rose-600">{fmt(w.row, w.v)}</span>
                          {w.row.unit ? ` ${w.row.unit}` : ''} vs portfolio avg {fmtIN(w.avg, w.row.dp ?? 2)} (
                          {w.row.better === 'lower' ? 'lower is better' : 'higher is better'})
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <PanelHead icon={<Gauge size={15} />} title="Data coverage" hint="Which headings the app already calculates, by section of the sheet" />
              <div className="px-5 py-4 space-y-3">
                {data.groups.map((g, gi) => {
                  const rs = rows.filter((r) => r.group === g.id)
                  const cap = rs.filter((r) => r.status !== 'missing')
                  const cells = cap.length * projects.length
                  const filled = cap.reduce((a, r) => a + projects.filter((p) => p.values[r.id] !== null).length, 0)
                  return (
                    <button key={g.id} onClick={() => (setGroup(g.id), setView('matrix'))} className="w-full text-left group">
                      <div className="flex items-center justify-between text-[12px] font-bold text-gray-700">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.tone }} />
                          {g.title}
                        </span>
                        <span className="text-gray-400 font-semibold">
                          {cap.length}/{rs.length} headings · {cells ? Math.round((filled / cells) * 100) : 0}% filled
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                        <motion.div
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(rs.filter((r) => r.status === 'captured').length / rs.length) * 100}%` }}
                          transition={{ delay: 0.4 + gi * 0.06, duration: 0.7, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="h-full bg-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(rs.filter((r) => r.status === 'partial').length / rs.length) * 100}%` }}
                          transition={{ delay: 0.5 + gi * 0.06, duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </button>
                  )
                })}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-gray-500">
                  <Legend cls="bg-emerald-500" label={`${coverage.captured} captured`} />
                  <Legend cls="bg-amber-400" label={`${coverage.partial} partly`} />
                  <Legend cls="bg-gray-200" label={`${coverage.missing} not captured yet`} />
                  <button onClick={() => setView('method')} className="ml-auto text-[#00509d] font-bold hover:underline flex items-center gap-1">
                    <BookOpen size={12} /> How it&apos;s calculated
                  </button>
                </div>
                {entryErrors.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-800">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={12} /> {entryErrors.length} value{entryErrors.length > 1 ? 's look' : ' looks'} like an entry mistake (left
                      out of averages)
                    </p>
                    <p className="mt-0.5 text-amber-700/80 truncate">
                      {entryErrors
                        .slice(0, 4)
                        .map((e) => `${e.p.name}: ${e.row.label} ${fmt(e.row, e.v)}`)
                        .join(' · ')}
                      {entryErrors.length > 4 ? ' …' : ''}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ---------------------------------------------------------------- the sheet */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <LayoutGrid size={16} className="text-[#00509d]" /> Efficiency comparison
                </h3>
                <p className="text-[11px] text-gray-400 font-semibold">Click a heading for the ranking chart · click a value to open its module</p>
              </div>
              <Segmented
                value={view}
                onChange={(v) => setView(v as 'matrix' | 'method')}
                items={[
                  ['matrix', 'Comparison'],
                  ['method', "How it's calculated"],
                ]}
                id="eff-view"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={exportCsv}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-[#00509d] hover:bg-blue-50 flex items-center gap-1.5"
                  title="Download as CSV (opens in Excel)"
                >
                  <Download size={14} /> Export
                </button>
                <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
                  <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                </button>
              </div>
            </div>

            <div className="px-5 pt-3 pb-2 flex flex-wrap gap-1.5">
              <GroupTab on={group === 'all'} onClick={() => setGroup('all')} label="All sections" tone={BLUE} />
              {data.groups.map((g) => (
                <GroupTab key={g.id} on={group === g.id} onClick={() => setGroup(g.id)} label={g.title} tone={g.tone} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {view === 'matrix' ? (
                <motion.div
                  key="matrix"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-auto max-h-[78vh] relative"
                >
                  <table className="border-separate border-spacing-0 text-[12px] min-w-full">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className="sticky left-0 z-30 bg-white min-w-[280px] border-b border-gray-100" rowSpan={2} />
                        {bands.map((b, i) => (
                          <th
                            key={b.name + i}
                            colSpan={b.n}
                            className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white border-l border-white/40"
                            style={{ background: brand(b.name) === 'SMARTWORLD' ? '#0a6fc2' : '#003366' }}
                          >
                            {b.name}
                          </th>
                        ))}
                        <th
                          rowSpan={2}
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white min-w-[96px] border-l border-white/40"
                        >
                          Portfolio avg
                        </th>
                      </tr>
                      <tr>
                        {projects.map((p) => (
                          <th
                            key={p.id}
                            className="bg-slate-50 border-b border-gray-200 border-l border-gray-100 px-2 py-2 min-w-[104px] max-w-[130px] align-bottom"
                          >
                            <button
                              onClick={() => navigate(`/dashboard/project/${p.id}/modules`)}
                              className="text-[11px] font-black text-gray-700 uppercase leading-tight hover:text-[#00509d] line-clamp-2"
                              title={`${p.name} · ${p.location}`}
                            >
                              {p.name}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.groups
                        .filter((g) => group === 'all' || g.id === group)
                        .map((g) => {
                          const rs = shownRows.filter((r) => r.group === g.id)
                          return (
                            <Fragment key={g.id}>
                              <tr>
                                <td colSpan={projects.length + 2} className="sticky left-0 z-10 p-0">
                                  <div
                                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-800 flex items-center gap-2 border-y border-gray-100"
                                    style={{ background: `${g.tone}26` }}
                                  >
                                    <span className="w-1 h-3.5 rounded-full" style={{ background: g.tone }} />
                                    {g.title}
                                  </div>
                                </td>
                              </tr>
                              {rs.map((r, ri) => (
                                <MatrixRow
                                  key={r.id}
                                  r={r}
                                  ri={ri}
                                  tone={g.tone}
                                  projects={projects}
                                  s={stats[r.id]}
                                  open={open === r.id}
                                  flash={flash}
                                  onToggle={() => setOpen((o) => (o === r.id ? null : r.id))}
                                  onCell={go}
                                  setTip={setTip}
                                />
                              ))}
                            </Fragment>
                          )
                        })}
                    </tbody>
                  </table>
                </motion.div>
              ) : (
                <motion.div key="method" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Methodology data={data} rows={shownRows} projects={projects} onRow={jumpTo} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* floating tooltip */}
      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[100] pointer-events-none max-w-[320px] rounded-xl bg-slate-900/95 text-white text-[11px] shadow-2xl px-3.5 py-2.5 backdrop-blur"
            style={{ left: Math.min(tip.x + 14, window.innerWidth - 340), top: Math.min(tip.y + 16, window.innerHeight - 170) }}
          >
            {tip.body}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================== matrix row */
function MatrixRow({
  r,
  ri,
  tone,
  projects,
  s,
  open,
  flash,
  onToggle,
  onCell,
  setTip,
}: {
  r: EffRowMeta
  ri: number
  tone: string
  projects: EffProject[]
  s: RowStats
  open: boolean
  flash: string | null
  onToggle: () => void
  onCell: (p: EffProject, r: EffRowMeta) => void
  setTip: (t: Tip) => void
}) {
  const St = STATUS[r.status]
  const missing = r.status === 'missing'
  return (
    <>
      <motion.tr
        id={`eff-row-${r.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(ri, 14) * 0.02 }}
        className={cn('group/row', flash === r.id && 'eff-flash')}
      >
        <td
          className={cn(
            'sticky left-0 z-10 border-b border-gray-50 px-0 py-0 bg-white group-hover/row:bg-slate-50 transition-colors',
            open && 'bg-blue-50/60',
          )}
        >
          <button onClick={onToggle} className="w-full flex items-center gap-2 pl-3 pr-3 py-2 text-left">
            <span className="w-0.5 self-stretch rounded-full" style={{ background: tone }} />
            <ChevronDown size={13} className={cn('text-gray-300 transition-transform shrink-0', !open && '-rotate-90', missing && 'opacity-0')} />
            <span className="min-w-0 flex-1">
              <span className={cn('block font-bold leading-tight', missing ? 'text-gray-400' : 'text-gray-800')}>{r.label}</span>
              <span className="block text-[10px] text-gray-400 font-semibold truncate">
                {r.unit ? `${r.unit} · ` : ''}
                {r.moduleNo} {r.module}
              </span>
            </span>
            {r.status !== 'captured' && (
              <span
                className={cn(
                  'text-[9px] font-black uppercase tracking-wide border rounded-full px-1.5 py-0.5 shrink-0 flex items-center gap-1',
                  missing ? 'bg-gray-50 text-gray-400 border-gray-200' : St.cls,
                )}
              >
                <St.icon size={9} />
                {r.status === 'missing' ? 'No input yet' : 'Partly'}
              </span>
            )}
            {r.better && (
              <span className="text-gray-300 shrink-0" title={r.better === 'lower' ? 'Lower is better' : 'Higher is better'}>
                {r.better === 'lower' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              </span>
            )}
          </button>
        </td>
        {missing ? (
          // no input in the app yet: blank cells (see "How it's calculated" for where it will be entered)
          <>
            {projects.map((p) => (
              <td key={p.id} className="border-b border-gray-50 border-l border-gray-50" />
            ))}
            <td className="border-b border-gray-50 border-l border-gray-100 bg-slate-50/70" />
          </>
        ) : (
          <>
            {projects.map((p) => {
              const v = p.values[r.id]
              return <Cell key={p.id} r={r} p={p} v={v} s={s} flash={flash === `${r.id}:${p.id}`} onClick={() => onCell(p, r)} setTip={setTip} />
            })}
            <td className="border-b border-gray-50 border-l border-gray-100 px-3 py-2 text-right font-black text-slate-700 bg-slate-50/70 tabular-nums">
              {s.avg === null ? <span className="text-gray-300">–</span> : fmtIN(s.avg, r.dp ?? 2)}
            </td>
          </>
        )}
      </motion.tr>
      <AnimatePresence initial={false}>
        {open && !missing && (
          <tr>
            <td colSpan={projects.length + 2} className="p-0 border-b border-gray-100">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <RankChart r={r} s={s} projects={projects} onCell={onCell} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function Cell({
  r,
  p,
  v,
  s,
  flash,
  onClick,
  setTip,
}: {
  r: EffRowMeta
  p: EffProject
  v: EffValue
  s: RowStats
  flash: boolean
  onClick: () => void
  setTip: (t: Tip) => void
}) {
  const bad = outOfRange(r, v)
  const score = rankScore(r, s, v)
  const out = isOutlier(r, s, v)
  const best = s.bestId === String(p.id) && typeof v === 'number' && !bad
  // heat: green (best) … red (worst), faint in the middle
  const bg =
    score === null ? undefined : score >= 0.5 ? `rgba(16,185,129,${0.04 + (score - 0.5) * 0.36})` : `rgba(244,63,94,${0.04 + (0.5 - score) * 0.32})`
  const tipBody = (
    <>
      <p className="font-black text-[12px]">{p.name}</p>
      <p className="text-blue-200 font-semibold">{r.label}</p>
      <p className="mt-1.5 text-[15px] font-black">
        {v === null ? 'Not entered' : fmt(r, v)}
        {v !== null && r.unit ? <span className="text-[10px] font-semibold text-slate-300"> {r.unit}</span> : null}
      </p>
      {bad && (
        <p className="text-amber-300 font-bold mt-0.5">
          Looks like an entry mistake — expected {r.sane![0]}–{r.sane![1]}. Left out of the average.
        </p>
      )}
      {typeof v === 'number' && !bad && s.avg !== null && (
        <p className="text-slate-300">
          Portfolio avg {fmtIN(s.avg, r.dp ?? 2)}
          {best ? ' · best in portfolio' : out ? ' · far worse than the portfolio' : ''}
        </p>
      )}
      <p className="mt-1.5 text-slate-400 leading-snug">{r.formula}</p>
      <p className="mt-1 text-[10px] font-bold text-emerald-300">
        Click to open {r.moduleNo} {r.module} →
      </p>
    </>
  )
  return (
    <td className="border-b border-gray-50 border-l border-gray-50 p-0">
      <button
        onClick={onClick}
        onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, body: tipBody })}
        onMouseLeave={() => setTip(null)}
        className={cn(
          'relative w-full h-full px-2 py-2 text-right tabular-nums transition-[transform,box-shadow] duration-150 hover:z-10 hover:scale-[1.06] hover:shadow-md hover:rounded-md',
          flash && 'eff-flash',
        )}
        style={{ background: bg }}
      >
        {v === null ? (
          <span className="text-gray-200">·</span>
        ) : bad ? (
          <span className="text-amber-600 font-bold inline-flex items-center gap-1">
            <AlertTriangle size={10} /> {fmt(r, v)}
          </span>
        ) : (
          <span className={cn('font-bold', out ? 'text-rose-600 font-black' : 'text-gray-800')}>
            {best && <Star size={9} className="inline -mt-0.5 mr-0.5 fill-amber-400 text-amber-400" />}
            {fmt(r, v)}
          </span>
        )}
      </button>
    </td>
  )
}

/* ================================================================== ranking chart under a row */
function RankChart({
  r,
  s,
  projects,
  onCell,
}: {
  r: EffRowMeta
  s: RowStats
  projects: EffProject[]
  onCell: (p: EffProject, r: EffRowMeta) => void
}) {
  const items = projects
    .map((p) => ({ p, v: p.values[r.id] }))
    .filter((x): x is { p: EffProject; v: number } => typeof x.v === 'number' && !outOfRange(r, x.v))
    .sort((a, b) => (r.better === 'higher' ? b.v - a.v : a.v - b.v))
  const text = projects.filter((p) => typeof p.values[r.id] === 'string')
  // scale from a little below the lowest value so the differences between projects show
  const vs = items.map((x) => x.v)
  const lo = Math.min(...vs, s.avg ?? Infinity)
  const hi = Math.max(...vs, s.avg ?? -Infinity)
  const pad = (hi - lo) * 0.35 || Math.abs(hi) * 0.1 || 1
  const min = lo - pad
  const span = hi - min || 1
  return (
    <div className="bg-gradient-to-b from-blue-50/50 to-white px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-1.5">
        {!items.length && !text.length && <p className="text-xs text-gray-400">No values yet.</p>}
        {items.map((x, i) => {
          const sc = rankScore(r, s, x.v)
          const color = sc === null ? '#00509d' : sc >= 0.66 ? '#10b981' : sc >= 0.33 ? '#f59e0b' : '#f43f5e'
          return (
            <button key={x.p.id} onClick={() => onCell(x.p, r)} className="w-full grid grid-cols-[150px_1fr_70px] items-center gap-3 group text-left">
              <span className="text-[11px] font-bold text-gray-600 truncate group-hover:text-[#00509d]">
                {i + 1}. {x.p.name}
              </span>
              <span className="relative h-3.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((x.v - min) / span) * 100}%` }}
                  transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }}
                />
                {s.avg !== null && (
                  <span
                    className="absolute inset-y-[-2px] w-0.5 bg-slate-800/70"
                    style={{ left: `${((s.avg - min) / span) * 100}%` }}
                    title="Portfolio average"
                  />
                )}
              </span>
              <span className="text-[11px] font-black text-gray-800 text-right tabular-nums">{fmt(r, x.v)}</span>
            </button>
          )
        })}
        {text.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {text.map((p) => (
              <button
                key={p.id}
                onClick={() => onCell(p, r)}
                className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#00509d]"
              >
                {p.name}: <b>{String(p.values[r.id])}</b>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="text-[11px] text-gray-600 space-y-2">
        <InfoLine label="Calculated as" value={r.formula} />
        <InfoLine label="Source" value={`${r.moduleNo} ${r.module}`} />
        {r.better && <InfoLine label="Better" value={r.better === 'lower' ? 'Lower value' : 'Higher value'} />}
        {s.avg !== null && (
          <InfoLine
            label="Portfolio"
            value={`avg ${fmtIN(s.avg, r.dp ?? 2)} · range ${fmtIN(s.min!, r.dp ?? 2)} – ${fmtIN(s.max!, r.dp ?? 2)} · ${s.n} projects`}
          />
        )}
        {r.note && (
          <p className="rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5 text-amber-800 flex gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5" /> {r.note}
          </p>
        )}
      </div>
    </div>
  )
}

/* ================================================================== how it's calculated */
function Methodology({ data, rows, projects, onRow }: { data: Efficiency; rows: EffRowMeta[]; projects: EffProject[]; onRow: (id: string) => void }) {
  return (
    <div className="overflow-auto max-h-[78vh]">
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 bg-slate-50 z-10">
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 font-black">
            <th className="text-left px-5 py-2.5">Heading</th>
            <th className="text-left px-3 py-2.5">How it is calculated</th>
            <th className="text-left px-3 py-2.5 whitespace-nowrap">Source module</th>
            <th className="text-left px-3 py-2.5">Status</th>
            <th className="text-right px-5 py-2.5 whitespace-nowrap">Projects with data</th>
          </tr>
        </thead>
        <tbody>
          {data.groups.map((g) => {
            const rs = rows.filter((r) => r.group === g.id)
            if (!rs.length) return null
            return (
              <Fragment key={g.id}>
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-800 border-y border-gray-100"
                    style={{ background: `${g.tone}26` }}
                  >
                    {g.title}
                  </td>
                </tr>
                {rs.map((r, i) => {
                  const St = STATUS[r.status]
                  const n = projects.filter((p) => p.values[r.id] !== null).length
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }}
                      className="border-b border-gray-50 align-top hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-2.5">
                        <button
                          onClick={() => r.status !== 'missing' && onRow(r.id)}
                          className={cn(
                            'font-bold text-left',
                            r.status !== 'missing' ? 'text-gray-800 hover:text-[#00509d]' : 'text-gray-500 cursor-default',
                          )}
                        >
                          {r.label}
                        </button>
                        {r.unit && <span className="block text-[10px] text-gray-400 font-semibold">{r.unit}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[520px]">
                        {r.formula}
                        {r.note && <span className="block mt-0.5 text-[11px] text-amber-700">{r.note}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        <b className="text-gray-800">{r.moduleNo}</b> {r.module}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-black whitespace-nowrap',
                            St.cls,
                          )}
                        >
                          <St.icon size={10} /> {St.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold text-gray-700 tabular-nums">
                        {r.status === 'missing' ? <span className="text-gray-300">–</span> : `${n} / ${projects.length}`}
                      </td>
                    </motion.tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================== project selector (multi-select dropdown) */
function ProjectPicker({ candidates, picked, setPicked }: { candidates: EffProject[]; picked: number[]; setPicked: (v: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const sel = candidates.filter((p) => picked.includes(p.id))
  const all = !sel.length
  const t = q.trim().toLowerCase()
  const list = candidates.filter((p) => !t || `${p.name} ${p.location} ${p.portfolio}`.toLowerCase().includes(t))
  const groups = [...new Set(list.map((p) => p.portfolio))]
  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const setGroup = (g: string, on: boolean) => {
    const ids = list.filter((p) => p.portfolio === g).map((p) => p.id)
    setPicked(on ? [...new Set([...picked, ...ids])] : picked.filter((x) => !ids.includes(x)))
  }
  return (
    <div ref={box} className="relative inline-block w-full max-w-[560px]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 bg-white text-gray-800 rounded-xl pl-3 pr-2.5 py-2 shadow-md hover:shadow-lg transition-shadow text-left"
      >
        <Building2 size={15} className="text-[#00509d] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">Projects</span>
        <span className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          {all ? (
            <span className="text-[13px] font-bold">All projects ({candidates.length})</span>
          ) : (
            <>
              {sel.slice(0, 3).map((p) => (
                <span
                  key={p.id}
                  className="shrink-0 inline-flex items-center gap-1 bg-blue-50 text-[#00509d] rounded-md pl-2 pr-1 py-0.5 text-[11px] font-bold max-w-[150px]"
                >
                  <span className="truncate">{p.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(p.id)
                    }}
                    className="hover:bg-blue-100 rounded p-0.5"
                    title={`Remove ${p.name}`}
                  >
                    <X size={10} />
                  </span>
                </span>
              ))}
              {sel.length > 3 && <span className="text-[11px] font-bold text-gray-500 shrink-0">+{sel.length - 3} more</span>}
            </>
          )}
        </span>
        <ChevronDown size={15} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search projects"
                  className="w-full h-8 pl-7 pr-2 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={() => setPicked([...new Set([...picked, ...list.map((p) => p.id)])])}
                className="text-[11px] font-bold text-[#00509d] hover:bg-blue-50 rounded-md px-2 py-1.5"
              >
                Select all
              </button>
              <button onClick={() => setPicked([])} className="text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-md px-2 py-1.5">
                Clear
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {!list.length && <p className="px-4 py-6 text-center text-[12px] text-gray-400">No projects match.</p>}
              {groups.map((g) => {
                const ps = list.filter((p) => p.portfolio === g)
                const on = ps.every((p) => picked.includes(p.id))
                return (
                  <div key={g}>
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={(e) => setGroup(g, e.target.checked)} className="accent-[#00509d]" />
                      {g} <span className="font-semibold normal-case tracking-normal text-gray-400">({ps.length})</span>
                    </label>
                    {ps.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-blue-50/60 cursor-pointer">
                        <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} className="accent-[#00509d]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-bold text-gray-800 truncate">{p.name}</span>
                          {p.location && <span className="block text-[10px] text-gray-400 truncate">{p.location}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>{all ? 'No selection — showing all projects' : `${sel.length} of ${candidates.length} selected`}</span>
              <button onClick={() => setOpen(false)} className="font-bold text-white bg-[#00509d] hover:bg-[#003f7a] rounded-md px-3 py-1">
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================== small pieces */
function HeadlineCard({
  r,
  s,
  projects,
  i,
  onOpen,
  setTip,
}: {
  r: EffRowMeta
  s: RowStats
  projects: EffProject[]
  i: number
  onOpen: () => void
  setTip: (t: Tip) => void
}) {
  const pts = projects
    .map((p) => ({ p, v: p.values[r.id] }))
    .filter((x): x is { p: EffProject; v: number } => typeof x.v === 'number' && !outOfRange(r, x.v))
  const best = projects.find((p) => String(p.id) === s.bestId)
  const lo = s.min ?? 0
  const hi = s.max ?? 1
  const span = hi - lo || 1
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="relative text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow p-4 overflow-hidden group"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00509d] via-sky-400 to-amber-300 opacity-70 group-hover:opacity-100 transition-opacity" />
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between h-[14px]">
        {r.label}
        {r.better === 'lower' ? (
          <TrendingDown size={13} className="text-gray-300" />
        ) : r.better === 'higher' ? (
          <TrendingUp size={13} className="text-gray-300" />
        ) : null}
      </p>
      <p className="mt-1.5 text-[28px] leading-none font-black text-gray-900 tabular-nums">
        {s.avg === null ? '–' : <CountUp value={s.avg} dp={r.dp ?? 2} />}
        {r.unit && s.avg !== null && <span className="text-xs font-bold text-gray-400 ml-1">{r.unit}</span>}
      </p>
      <p className="text-[10px] font-semibold text-gray-400 mt-1">portfolio average · {s.n} projects</p>
      {/* range strip with a dot per project */}
      <div className="relative h-6 mt-3">
        <div
          className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full"
          style={{
            background:
              r.better === 'lower'
                ? 'linear-gradient(90deg,#10b981,#facc15,#f43f5e)'
                : r.better === 'higher'
                  ? 'linear-gradient(90deg,#f43f5e,#facc15,#10b981)'
                  : '#e2e8f0',
          }}
        />
        {pts.map((x, k) => (
          <motion.span
            key={x.p.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.06 + k * 0.03, type: 'spring', stiffness: 380, damping: 18 }}
            onMouseMove={(e) => {
              e.stopPropagation()
              setTip({
                x: e.clientX,
                y: e.clientY,
                body: (
                  <span>
                    <b>{x.p.name}</b>: {fmt(r, x.v)} {r.unit ?? ''}
                  </span>
                ),
              })
            }}
            onMouseLeave={() => setTip(null)}
            className="absolute top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-white border-2 border-slate-700 shadow hover:scale-150 transition-transform"
            style={{ left: `${((x.v - lo) / span) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-bold text-gray-400 tabular-nums">
        <span>{s.min === null ? '' : fmtIN(s.min, r.dp ?? 2)}</span>
        <span>{s.max === null ? '' : fmtIN(s.max, r.dp ?? 2)}</span>
      </div>
      {best && (
        <p className="mt-2 text-[11px] font-semibold text-gray-600 truncate">
          <Star size={10} className="inline -mt-0.5 mr-1 fill-amber-400 text-amber-400" />
          Best: <b className="text-gray-800">{best.name}</b> {fmt(r, best.values[r.id])}
        </p>
      )}
    </motion.button>
  )
}

function CountUp({ value, dp }: { value: number; dp: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView || !ref.current) return
    const el = ref.current
    const c = animate(0, value, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => (el.textContent = fmtIN(v, dp)) })
    return () => c.stop()
  }, [inView, value, dp])
  return <span ref={ref}>{fmtIN(0, dp)}</span>
}

function HeroStat({ label, value, suffix, dp = 0 }: { label: string; value: number; suffix?: string; dp?: number }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-3">
      <p className="text-2xl font-black tabular-nums">
        <CountUp value={value} dp={dp} />
        <span className="text-sm font-bold text-blue-200">{suffix}</span>
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mt-0.5">{label}</p>
    </div>
  )
}

function Chip({ on, onClick, children, dark }: { on: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all',
        dark
          ? on
            ? 'bg-white text-[#00509d] border-white shadow'
            : 'bg-white/5 text-white border-white/25 hover:bg-white/15'
          : on
            ? 'bg-[#00509d] text-white border-[#00509d]'
            : 'bg-white text-[#00509d] border-blue-100 hover:bg-blue-50',
      )}
    >
      {children}
    </button>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-2 select-none">
      <span className={cn('relative w-8 h-4.5 h-[18px] rounded-full transition-colors', on ? 'bg-emerald-400' : 'bg-white/25')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow', on ? 'right-0.5' : 'left-0.5')}
        />
      </span>
      {label}
    </button>
  )
}

function Segmented({ value, onChange, items, id }: { value: string; onChange: (v: string) => void; items: [string, string][]; id: string }) {
  return (
    <div className="relative flex bg-slate-100 rounded-xl p-1">
      {items.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            'relative px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors',
            value === k ? 'text-white' : 'text-gray-500 hover:text-gray-800',
          )}
        >
          {value === k && (
            <motion.span
              layoutId={id}
              className="absolute inset-0 rounded-lg bg-[#00509d] shadow"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

function GroupTab({ on, onClick, label, tone }: { on: boolean; onClick: () => void; label: string; tone: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors',
        on ? 'text-gray-900 border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-300',
      )}
    >
      {on && (
        <motion.span
          layoutId="eff-group"
          className="absolute inset-0 rounded-full"
          style={{ background: `${tone}40`, boxShadow: `inset 0 0 0 1.5px ${tone}` }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: tone }} />
        {label}
      </span>
    </button>
  )
}

function PanelHead({ icon, title, hint, count }: { icon: React.ReactNode; title: string; hint: string; count?: number }) {
  return (
    <div className="px-5 py-3.5 border-b border-gray-100">
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
        <span className="text-[#00509d]">{icon}</span>
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-black bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">{count}</span>
        )}
      </h3>
      <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{hint}</p>
    </div>
  )
}

const Legend = ({ cls, label }: { cls: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className={cn('w-2.5 h-2.5 rounded-sm', cls)} />
    {label}
  </span>
)
const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <p>
    <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</span>
    <span className="font-semibold text-gray-700">{value}</span>
  </p>
)
