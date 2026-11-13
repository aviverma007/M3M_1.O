/**
 * Portfolio overview (owner's home): /dashboard/portfolio
 * Totals, average efficiency and status counts across projects (filter by portfolio), every number clickable to the
 * projects behind it; project table with health score, top problems and data quality.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownUp, ChevronDown, ChevronRight, Columns3, ExternalLink, LoaderCircle, RefreshCw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fmtArea, fmtCr, fmtIN, fmtPct } from '@/lib/format'
import { getPortfolio as getSelectedPortfolio } from '@/state/portfolio'
import { getPortfolio, isTestProject, STATUS_META, type HealthStatus, type Portfolio, type PortfolioProject } from '@/api/portfolio'
import { CompletenessBadge, HealthBreakdown, HealthRing, ProblemList, StatusPill } from '@/components/portfolio/HealthBits'

type Focus = { key: string; label: string; test: (p: PortfolioProject) => boolean } | null
type SortKey = 'health' | 'name' | 'units' | 'saleable' | 'gsv' | 'carpet' | 'farUtil' | 'data' | 'updated'

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export default function PortfolioPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  // start on the company picked in the header switcher ("All Portfolios" = all)
  const [portfolio, setPortfolio] = useState(() => getSelectedPortfolio() || 'All')
  const [hideTest, setHideTest] = useState(true)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState<Focus>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'health', dir: 1 })
  const [open, setOpen] = useState<number | null>(null)
  const [picked, setPicked] = useState<number[]>([])

  const load = () => {
    setLoading(true)
    getPortfolio()
      .then(setData)
      .catch((e) => {
        console.error('Error loading portfolio', e)
        toast.error('Failed to load the portfolio')
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const portfolios = useMemo(() => ['All', ...[...new Set((data?.projects ?? []).map((p) => p.portfolio))].sort()], [data])
  useEffect(() => {
    if (data && !portfolios.includes(portfolio)) setPortfolio('All')
  }, [data, portfolios, portfolio])
  const scope = useMemo(
    () =>
      (data?.projects ?? []).filter((p) => (portfolio === 'All' || p.portfolio === portfolio) && (!hideTest || !isTestProject(p.name))),
    [data, portfolio, hideTest],
  )
  const k = useMemo(() => kpis(scope), [scope])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = scope.filter((p) => (!focus || focus.test(p)) && (!t || `${p.name} ${p.location}`.toLowerCase().includes(t)))
    const val = (p: PortfolioProject): number | string => {
      switch (sort.key) {
        case 'health':
          return p.health.score ?? 101 // "not enough data" after the scored projects (worst first by default)
        case 'name':
          return p.name.toLowerCase()
        case 'units':
          return p.metrics.totalUnits ?? -1
        case 'saleable':
          return p.metrics.saleable ?? -1
        case 'gsv':
          return p.metrics.gsv ?? -1
        case 'carpet':
          return p.metrics.carpetSaleable ?? -1
        case 'farUtil':
          return p.metrics.farUtil ?? -1
        case 'data':
          return p.completeness.pct
        case 'updated':
          return p.lastUpdate.at ?? ''
      }
    }
    return [...list].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [scope, focus, q, sort])

  const drill = (key: string, label: string, test: (p: PortfolioProject) => boolean) => {
    setFocus(focus?.key === key ? null : { key, label, test })
    setTimeout(() => document.getElementById('pf-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const sortBy = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))
  const togglePick = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? (toast.error('Compare up to 5 projects'), p) : [...p, id]))
  const compare = () => {
    if (picked.length < 2) return toast.error('Pick at least 2 projects to compare')
    navigate(`/dashboard/project/${picked[0]}/comparison?ids=${picked.join(',')}`)
  }

  if (loading && !data)
    return (
      <div className="flex justify-center p-24">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#00509d]" />
      </div>
    )

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 w-full space-y-6">
      {/* header + filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Portfolio Overview</h1>
          <p className="text-sm font-semibold text-gray-400 mt-1">
            {scope.length} projects · figures from each project&apos;s modules · as of {data ? new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {portfolios.map((p) => (
            <button
              key={p}
              onClick={() => setPortfolio(p)}
              className={cn(
                'px-3.5 py-2 rounded-full text-xs font-bold border transition-colors',
                portfolio === p ? 'bg-[#00509d] text-white border-[#00509d]' : 'bg-white text-[#00509d] border-blue-100 hover:bg-blue-50',
              )}
            >
              {p}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 ml-2 cursor-pointer select-none">
            <input type="checkbox" checked={hideTest} onChange={(e) => setHideTest(e.target.checked)} className="accent-[#00509d]" />
            Hide test / demo projects
          </label>
          <button onClick={load} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi label="Projects" value={fmtIN(scope.length)} sub={`${k.byStatus['on-track']} on track · ${k.byStatus['at-risk']} at risk`} onClick={() => setFocus(null)} />
        <Kpi label="Total units" value={fmtIN(k.units, 0)} sub={`${fmtIN(k.resUnits, 0)} residential`} onClick={() => drill('units', 'Projects with units', (p) => !!p.metrics.totalUnits)} />
        <Kpi label="Saleable area" value={k.saleable >= 1e5 ? `${fmtIN(k.saleable / 1e5, 2)} lakh` : fmtArea(k.saleable)} sub={`sq ft · ${k.withSaleable} projects`} onClick={() => drill('saleable', 'Projects with saleable area', (p) => !!p.metrics.saleable)} />
        <Kpi
          label="Gross sales value"
          value={k.gsv ? fmtCr(k.gsv, 0) : '—'}
          sub={k.priced ? `${k.priced} of ${scope.length} projects have a sales price` : 'No sales price entered yet'}
          warn={k.priced < scope.length}
          onClick={() => drill('priced', 'Projects with a sales price', (p) => p.metrics.gsv !== null)}
        />
        <Kpi
          label="Construction cost"
          value={k.cost ? fmtCr(k.cost, 0) : '—'}
          sub={k.costPct !== null ? `${fmtPct(k.costPct)} of sales value` : `${k.costed} projects with cost on BUA`}
          warn={k.costed < scope.length}
          onClick={() => drill('costed', 'Projects with construction cost', (p) => p.metrics.cost !== null)}
        />
        <Kpi label="Average health" value={k.health === null ? '—' : `${Math.round(k.health)}/100`} sub="weighted score, see table" onClick={() => setSort({ key: 'health', dir: 1 })} />
      </div>

      {/* efficiency + status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Average efficiency" hint="Simple average of projects that have the figure; best and worst project shown">
          <div className="grid grid-cols-2 gap-3">
            <Eff label="Carpet / Saleable" unit="%" target="55–60%" stat={k.eff.carpet} better="higher" onPick={drill} metric="carpet" />
            <Eff label="Saleable / FAR" unit="" target="1.4–1.6" stat={k.eff.saFar} better="higher" onPick={drill} metric="saFar" />
            <Eff label="FAR utilisation" unit="%" target="up to 100%" stat={k.eff.farUtil} better="higher" onPick={drill} metric="farUtil" />
            <Eff label="Car parks per unit" unit="" target="" stat={k.eff.cars} better="higher" onPick={drill} metric="cars" />
          </div>
        </Panel>
        <Panel title="Status" hint="Click a number to list those projects">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['on-track', 'attention', 'at-risk', 'no-data'] as HealthStatus[]).map((s) => (
              <StatusTile key={s} status={s} n={k.byStatus[s]} active={focus?.key === s} onClick={() => drill(s, STATUS_META[s].label, (p) => p.health.status === s)} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <CountTile
              label="With benchmark deviations"
              n={k.withDev}
              active={focus?.key === 'dev'}
              onClick={() => drill('dev', 'Projects with benchmark deviations', (p) => p.checks.failed.length > 0)}
            />
            <CountTile
              label="Approvals pending"
              n={k.apprPending}
              active={focus?.key === 'appr'}
              onClick={() => drill('appr', 'Projects with approvals pending', (p) => p.approvals.listed > p.approvals.received)}
            />
            <CountTile label="RERA not approved" n={k.reraPending} active={focus?.key === 'rera'} onClick={() => drill('rera', 'RERA not approved', (p) => p.approvals.rera !== 'Approved')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <CountTile
              label="Data errors to fix"
              n={k.dataErr}
              tone="red"
              active={focus?.key === 'err'}
              onClick={() => drill('err', 'Projects with data errors', (p) => p.dataIssues.some((i) => i.level === 'error'))}
            />
            <CountTile label="Less than half the data entered" n={k.lowData} tone="amber" active={focus?.key === 'low'} onClick={() => drill('low', 'Less than half the data entered', (p) => p.completeness.pct < 50)} />
          </div>
        </Panel>
      </div>

      {/* project table */}
      <div id="pf-table" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-20">
        <div className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800">Projects</h2>
            {focus && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00509d] bg-blue-50 border border-blue-100 rounded-full pl-3 pr-1.5 py-1">
                {focus.label} ({rows.length})
                <button onClick={() => setFocus(null)} className="p-0.5 rounded-full hover:bg-blue-100" title="Show all">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <Button onClick={compare} disabled={picked.length < 2} className="bg-[#00509d] hover:bg-[#003f7a] text-white gap-2 h-9 text-xs font-bold rounded-lg">
            <Columns3 size={14} /> Compare selected ({picked.length})
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#00509d] text-white text-[10px] uppercase tracking-wider">
                <th className="w-8" />
                <Th onClick={() => sortBy('health')} active={sort.key === 'health'}>
                  Health
                </Th>
                <Th onClick={() => sortBy('name')} active={sort.key === 'name'} left>
                  Project
                </Th>
                <Th onClick={() => sortBy('units')} active={sort.key === 'units'}>
                  Units
                </Th>
                <Th onClick={() => sortBy('saleable')} active={sort.key === 'saleable'}>
                  Saleable (sq ft)
                </Th>
                <Th onClick={() => sortBy('gsv')} active={sort.key === 'gsv'}>
                  Sales value
                </Th>
                <Th onClick={() => sortBy('carpet')} active={sort.key === 'carpet'}>
                  Carpet / Saleable
                </Th>
                <Th onClick={() => sortBy('farUtil')} active={sort.key === 'farUtil'}>
                  FAR util.
                </Th>
                <th className="px-3 py-3 font-bold">Approvals</th>
                <Th onClick={() => sortBy('data')} active={sort.key === 'data'}>
                  Data
                </Th>
                <th className="px-3 py-3 font-bold text-left">Top problem</th>
                <Th onClick={() => sortBy('updated')} active={sort.key === 'updated'}>
                  Last updated
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <Fragment key={p.id}>
                  <tr className={cn('hover:bg-slate-50 cursor-pointer transition-colors', open === p.id && 'bg-blue-50/40')} onClick={() => setOpen(open === p.id ? null : p.id)}>
                    <td className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={picked.includes(p.id)} onChange={() => togglePick(p.id)} className="accent-[#00509d]" title="Select to compare" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <HealthRing score={p.health.score} status={p.health.status} size={40} stroke={4} />
                        <StatusPill status={p.health.status} className="hidden 2xl:inline-flex" />
                      </div>
                    </td>
                    <td className="px-3 py-3 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        {open === p.id ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                        <span className="font-bold text-gray-800">{p.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 pl-5">
                        {p.location} · {p.portfolio}
                        {p.category ? ` · ${p.category}` : ''}
                      </div>
                    </td>
                    <Td>{fmtIN(p.metrics.totalUnits, 0)}</Td>
                    <Td>{fmtIN(p.metrics.saleable, 0)}</Td>
                    <Td>{p.metrics.gsv ? fmtCr(p.metrics.gsv, 0) : '—'}</Td>
                    <Td tone={tone(p.metrics.carpetSaleable, 55, 60)}>{fmtPct(p.metrics.carpetSaleable)}</Td>
                    <Td tone={p.metrics.farUtil === null ? undefined : p.metrics.farUtil > 100.5 ? 'bad' : p.metrics.farUtil >= 95 ? 'good' : 'warn'}>{fmtPct(p.metrics.farUtil)}</Td>
                    <Td>
                      {p.approvals.listed ? (
                        <span className={cn('font-semibold', p.approvals.overdue ? 'text-red-600' : 'text-gray-700')}>
                          {p.approvals.received}/{p.approvals.listed}
                          {p.approvals.overdue ? <span className="block text-[10px]">{p.approvals.overdue} overdue</span> : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <span className={cn('font-bold', p.completeness.pct >= 80 ? 'text-green-700' : p.completeness.pct >= 50 ? 'text-amber-600' : 'text-red-600')}>{p.completeness.pct}%</span>
                    </Td>
                    <td className="px-3 py-3 max-w-[320px] text-xs text-gray-600">
                      <span className="line-clamp-2">{p.health.problems[0] ? `${p.health.problems[0].module}: ${p.health.problems[0].text}` : '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-gray-500 whitespace-nowrap text-center">
                      {when(p.lastUpdate.at)}
                      {p.lastUpdate.by && <div className="text-gray-400">by {p.lastUpdate.by}</div>}
                    </td>
                  </tr>
                  {open === p.id && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={12} className="px-6 py-5">
                        <ProjectDetail p={p} weights={data!.weights} onOpen={() => navigate(`/dashboard/project/${p.id}/modules`)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={12} className="text-center text-gray-400 py-12">
                    No projects match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-center pb-6">
        Health = within benchmark {data?.weights.benchmarks}% · data completeness {data?.weights.completeness}% · approvals received {data?.weights.approvals}% · milestones on time{' '}
        {data?.weights.schedule}%; parts without data are left out. 75+ on track, 50–74 needs attention, below 50 at risk. Sales value = sales price × saleable area; construction cost = cost on BUA × built-up area (Module 6).
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ aggregates */
type Stat = { avg: number | null; best: { name: string; v: number } | null; worst: { name: string; v: number } | null; n: number }
function stat(list: PortfolioProject[], f: (p: PortfolioProject) => number | null, better: 'higher' | 'lower' = 'higher'): Stat {
  const v = list.map((p) => ({ name: p.name, v: f(p) })).filter((x): x is { name: string; v: number } => x.v !== null && Number.isFinite(x.v))
  if (!v.length) return { avg: null, best: null, worst: null, n: 0 }
  const sorted = [...v].sort((a, b) => (better === 'higher' ? b.v - a.v : a.v - b.v))
  return { avg: avg(v.map((x) => x.v)), best: sorted[0], worst: sorted[sorted.length - 1], n: v.length }
}
function kpis(list: PortfolioProject[]) {
  const by = { 'on-track': 0, attention: 0, 'at-risk': 0, 'no-data': 0 } as Record<HealthStatus, number>
  list.forEach((p) => by[p.health.status]++)
  const gsv = sum(list.map((p) => p.metrics.gsv))
  const cost = sum(list.map((p) => p.metrics.cost))
  const both = list.filter((p) => p.metrics.gsv && p.metrics.cost)
  return {
    units: sum(list.map((p) => p.metrics.totalUnits)),
    resUnits: sum(list.map((p) => p.metrics.residentialUnits)),
    saleable: sum(list.map((p) => p.metrics.saleable)),
    withSaleable: list.filter((p) => p.metrics.saleable).length,
    gsv,
    cost,
    priced: list.filter((p) => p.metrics.gsv !== null).length,
    costed: list.filter((p) => p.metrics.cost !== null).length,
    costPct: both.length ? (sum(both.map((p) => p.metrics.cost)) / sum(both.map((p) => p.metrics.gsv))) * 100 : null,
    health: avg(list.filter((p) => p.health.score !== null).map((p) => p.health.score)),
    byStatus: by,
    withDev: list.filter((p) => p.checks.failed.length > 0).length,
    apprPending: list.filter((p) => p.approvals.listed > p.approvals.received).length,
    reraPending: list.filter((p) => p.approvals.rera !== 'Approved').length,
    dataErr: list.filter((p) => p.dataIssues.some((i) => i.level === 'error')).length,
    lowData: list.filter((p) => p.completeness.pct < 50).length,
    eff: {
      carpet: stat(list, (p) => p.metrics.carpetSaleable),
      saFar: stat(list, (p) => p.metrics.saleableFar),
      farUtil: stat(list, (p) => p.metrics.farUtil),
      cars: stat(list, (p) => p.metrics.carsPerUnit),
    },
  }
}
const tone = (v: number | null, lo: number, hi: number): 'good' | 'warn' | undefined => (v === null ? undefined : v >= lo && v <= hi + 0.5 ? 'good' : 'warn')

/* ------------------------------------------------------------------ pieces */
function Kpi({ label, value, sub, onClick, warn }: { label: string; value: string; sub: string; onClick?: () => void; warn?: boolean }) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cmp-rise">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-black text-[#1A3566] mt-1.5 truncate" title={value}>
        {value}
      </p>
      <p className={cn('text-[11px] mt-1 truncate', warn ? 'text-amber-600 font-semibold' : 'text-gray-500')} title={sub}>
        {sub}
      </p>
    </button>
  )
}

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#1A3566]">{title}</h2>
        <span className="text-[11px] text-gray-400">{hint}</span>
      </div>
      {children}
    </div>
  )
}

function Eff({ label, unit, target, stat: s, onPick, metric }: { label: string; unit: string; target: string; stat: Stat; better: 'higher' | 'lower'; onPick: (k: string, l: string, t: (p: PortfolioProject) => boolean) => void; metric: string }) {
  const f = (v: number | null) => (v === null ? '—' : `${fmtIN(v, 2)}${unit}`)
  const field = { carpet: 'carpetSaleable', saFar: 'saleableFar', farUtil: 'farUtil', cars: 'carsPerUnit' }[metric] as keyof PortfolioProject['metrics']
  return (
    <button onClick={() => onPick(`eff-${metric}`, `${label} entered`, (p) => p.metrics[field] !== null)} className="text-left rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:bg-blue-50/50 transition-colors">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-bold text-gray-500">{label}</span>
        {target && <span className="text-[10px] text-gray-400">target {target}</span>}
      </div>
      <p className="text-xl font-black text-[#1A3566] mt-1">{f(s.avg)}</p>
      <p className="text-[10px] text-gray-500 mt-1 truncate">
        {s.best ? (
          <>
            Best <b className="text-green-700">{f(s.best.v)}</b> {s.best.name} · lowest <b className="text-red-600">{f(s.worst!.v)}</b> {s.worst!.name}
          </>
        ) : (
          'No project has this yet'
        )}
      </p>
      <p className="text-[10px] text-gray-400">{s.n} projects</p>
    </button>
  )
}

function StatusTile({ status, n, onClick, active }: { status: HealthStatus; n: number; onClick: () => void; active: boolean }) {
  const m = STATUS_META[status]
  return (
    <button onClick={onClick} className={cn('rounded-xl p-3 text-left border-2 transition-all hover:-translate-y-0.5', active ? 'shadow-md' : 'border-transparent')} style={{ background: m.bg, borderColor: active ? m.ring : 'transparent' }}>
      <p className="text-3xl font-black" style={{ color: m.color }}>
        {n}
      </p>
      <p className="text-[11px] font-bold mt-0.5" style={{ color: m.color }}>
        {m.label}
      </p>
    </button>
  )
}

function CountTile({ label, n, onClick, active, tone: t = 'blue' }: { label: string; n: number; onClick: () => void; active: boolean; tone?: 'blue' | 'red' | 'amber' }) {
  const c = { blue: ['#1A3566', '#EEF4FB'], red: ['#B91C1C', '#FEF2F2'], amber: ['#B45309', '#FFFBEB'] }[t]
  return (
    <button onClick={onClick} className={cn('flex items-center justify-between rounded-xl px-4 py-3 border-2 transition-all hover:-translate-y-0.5')} style={{ background: c[1], borderColor: active ? c[0] : 'transparent' }}>
      <span className="text-xs font-semibold text-gray-600 text-left">{label}</span>
      <span className="text-xl font-black" style={{ color: c[0] }}>
        {n}
      </span>
    </button>
  )
}

function Th({ children, onClick, active, left }: { children: React.ReactNode; onClick: () => void; active: boolean; left?: boolean }) {
  return (
    <th className={cn('px-3 py-3 font-bold cursor-pointer select-none whitespace-nowrap', left ? 'text-left' : 'text-center')} onClick={onClick}>
      <span className={cn('inline-flex items-center gap-1', active && 'text-[#FCD34D]')}>
        {children}
        <ArrowDownUp size={10} className="opacity-60" />
      </span>
    </th>
  )
}

function Td({ children, tone: t }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return <td className={cn('px-3 py-3 text-center whitespace-nowrap font-semibold', t === 'good' ? 'text-green-700' : t === 'warn' ? 'text-amber-600' : t === 'bad' ? 'text-red-600' : 'text-gray-700')}>{children}</td>
}

function ProjectDetail({ p, weights, onOpen }: { p: PortfolioProject; weights: Record<string, number>; onOpen: () => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 cmp-rise">
      <div className="flex gap-4">
        <HealthRing score={p.health.score} status={p.health.status} size={84} stroke={8} />
        <div className="flex-1 min-w-0">
          <StatusPill status={p.health.status} />
          <div className="mt-3">
            <HealthBreakdown parts={p.health.parts} weights={weights} />
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            {p.checks.ok} of {p.checks.total} benchmarked parameters within benchmark
            {p.approvals.due ? ` · ${p.approvals.onTime} of ${p.approvals.due} due milestones on time` : ''}
          </p>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-[#1A3566] mb-2">Top problems</p>
        <ProblemList problems={p.health.problems} limit={6} />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <CompletenessBadge pct={p.completeness.pct} missing={p.completeness.missing} />
          {p.approvals.rera !== 'Not listed' && <span className="text-[11px] font-semibold rounded-md px-2 py-1 bg-slate-50 border border-slate-200">RERA: {p.approvals.rera}</span>}
        </div>
        {p.completeness.missing.length > 0 && (
          <p className="text-[11px] text-gray-500">
            <b className="text-gray-600">Not entered yet:</b> {p.completeness.missing.join(', ')}
          </p>
        )}
        {p.dataIssues.length > 0 && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-red-700 mb-1">Data to check</p>
            <ul className="space-y-1">
              {p.dataIssues.map((i, n) => (
                <li key={n} className={cn('text-[11px] leading-snug', i.level === 'error' ? 'text-red-700' : 'text-amber-700')}>
                  • <b>{i.module}:</b> {i.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button onClick={onOpen} variant="outline" className="h-8 text-xs font-bold gap-1.5 border-blue-200 text-[#00509d]">
          Open project <ExternalLink size={12} />
        </Button>
      </div>
    </div>
  )
}
