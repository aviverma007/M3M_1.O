/*
 * Efficiency Dashboard › Export: choose format (PDF / PowerPoint / Excel) and what goes in, check the print preview
 * page by page, then download. Starts from what the dashboard shows: the selected projects, the filters and the
 * section tab.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, LoaderCircle, Presentation, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EffGroup, EffRowMeta } from '@/lib/efficiency'
import type { EffProject } from '@/api/portfolio'
import { BRAND, TONE_FILL, TONE_TEXT, buildReport, type ReportOptions, type ReportPage } from '@/lib/efficiencyReport'

type Format = 'pdf' | 'ppt' | 'xlsx'
const FORMATS: { id: Format; label: string; hint: string; icon: typeof FileText }[] = [
  { id: 'pdf', label: 'PDF', hint: 'A4 landscape, ready to print', icon: FileText },
  { id: 'ppt', label: 'PowerPoint', hint: '16:9 slides for a review meeting', icon: Presentation },
  { id: 'xlsx', label: 'Excel', hint: 'raw numbers, a sheet per section', icon: FileSpreadsheet },
]
/** page size in preview pixels */
const SIZE: Record<Format, { w: number; h: number }> = { pdf: { w: 1123, h: 794 }, ppt: { w: 1280, h: 720 }, xlsx: { w: 1123, h: 794 } }

export default function EfficiencyExport({
  open,
  onClose,
  data,
  projects,
  initialGroups,
  filters,
}: {
  open: boolean
  onClose: () => void
  data: { groups: EffGroup[]; rows: EffRowMeta[] }
  projects: EffProject[]
  initialGroups: string[]
  filters: { portfolio: string; type: string }
}) {
  const [format, setFormat] = useState<Format>('pdf')
  const [groups, setGroups] = useState<string[]>(initialGroups)
  const [cover, setCover] = useState(true)
  const [summary, setSummary] = useState(true)
  const [method, setMethod] = useState(true)
  const [hideEmpty, setHideEmpty] = useState(true)
  const [name, setName] = useState(`Project_Design_Efficiencies_${new Date().toISOString().slice(0, 10)}`)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setGroups(initialGroups)
  }, [open, initialGroups])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, busy, onClose])

  const opt: ReportOptions = useMemo(
    () => ({
      groups,
      cover,
      summary,
      method,
      hideEmpty,
      perPage: format === 'ppt' ? 7 : 8,
      rowsPerPage: format === 'ppt' ? 10 : 14,
      watchRows: format === 'ppt' ? 9 : 12,
    }),
    [groups, cover, summary, method, hideEmpty, format],
  )
  const pages = useMemo(() => (open ? buildReport(data, projects, opt, filters) : []), [open, data, projects, opt, filters])

  const download = async () => {
    if (!groups.length) return toast.error('Pick at least one section')
    setBusy(true)
    try {
      const x = await import('@/lib/efficiencyExport')
      const file = name.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'Project_Design_Efficiencies'
      if (format === 'pdf') await x.exportPdf(pages, file)
      else if (format === 'ppt') await x.exportPpt(pages, file)
      else await x.exportXlsx(data, projects, groups, file, hideEmpty)
      toast.success('Export downloaded')
      onClose()
    } catch (e) {
      console.error('Export failed', e)
      toast.error('Export failed — please try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[1320px] h-[92vh] flex overflow-hidden"
            role="dialog"
            aria-label="Export efficiency report"
          >
            {/* options */}
            <div className="w-[320px] shrink-0 border-r border-gray-100 flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">Export report</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">
                    {projects.length} project{projects.length === 1 ? '' : 's'} · {filters.portfolio} · {filters.type}
                  </p>
                </div>
                <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <Block title="Format">
                  <div className="space-y-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                          format === f.id ? 'border-[#00509d] bg-blue-50/60 ring-1 ring-[#00509d]' : 'border-gray-200 hover:border-gray-300',
                        )}
                      >
                        <f.icon size={18} className={format === f.id ? 'text-[#00509d]' : 'text-gray-400'} />
                        <span>
                          <span className="block text-[13px] font-bold text-gray-800">{f.label}</span>
                          <span className="block text-[10px] text-gray-400 font-semibold">{f.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Block>
                <Block
                  title="Sections"
                  action={
                    <button
                      onClick={() => setGroups(groups.length === data.groups.length ? [] : data.groups.map((g) => g.id))}
                      className="text-[11px] font-bold text-[#00509d] hover:underline"
                    >
                      {groups.length === data.groups.length ? 'None' : 'All'}
                    </button>
                  }
                >
                  <div className="space-y-1">
                    {data.groups.map((g) => (
                      <Check
                        key={g.id}
                        on={groups.includes(g.id)}
                        onChange={(v) =>
                          setGroups(
                            v ? data.groups.filter((x) => x.id === g.id || groups.includes(x.id)).map((x) => x.id) : groups.filter((x) => x !== g.id),
                          )
                        }
                      >
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: g.tone }} />
                        {g.title}
                      </Check>
                    ))}
                  </div>
                </Block>
                {format !== 'xlsx' && (
                  <Block title="Include">
                    <div className="space-y-1">
                      <Check on={cover} onChange={setCover}>
                        Cover page
                      </Check>
                      <Check on={summary} onChange={setSummary}>
                        Summary &amp; watch list
                      </Check>
                      <Check on={method} onChange={setMethod}>
                        How it&apos;s calculated (appendix)
                      </Check>
                    </div>
                  </Block>
                )}
                <Block title="Headings">
                  <Check on={hideEmpty} onChange={setHideEmpty}>
                    Leave out headings with no values
                  </Check>
                </Block>
                <Block title="File name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </Block>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Projects, portfolio and type come from the dashboard. Change them there with the Projects selector and filters.
                </p>
              </div>
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={download}
                  disabled={busy || !groups.length || !projects.length}
                  className="w-full h-11 rounded-xl bg-[#00509d] hover:bg-[#003f7a] disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
                  {busy ? 'Preparing…' : `Download ${FORMATS.find((f) => f.id === format)!.label}`}
                </button>
              </div>
            </div>

            {/* print preview */}
            <div className="flex-1 min-w-0 bg-slate-100 flex flex-col">
              <div className="px-5 py-3 border-b border-gray-200 bg-white/70 flex items-center justify-between">
                <p className="text-[12px] font-bold text-gray-700">
                  Print preview{' '}
                  <span className="text-gray-400 font-semibold">
                    ·{' '}
                    {format === 'xlsx'
                      ? 'Excel holds the same tables, one sheet per section'
                      : `${pages.length} page${pages.length === 1 ? '' : 's'}`}
                  </span>
                </p>
                <p className="text-[11px] text-gray-400 font-semibold">{format === 'ppt' ? '16:9 widescreen' : 'A4 landscape'}</p>
              </div>
              <Preview pages={pages} format={format} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ================================================================== preview pages (HTML twin of the PDF / PPT) */
function Preview({ pages, format }: { pages: ReportPage[]; format: Format }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(800)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth - 48))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const size = SIZE[format]
  const scale = Math.min(1, w / size.w)
  if (!pages.length)
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Nothing to export — pick at least one section.</div>
  return (
    <div ref={box} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {pages.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 6) * 0.04 }}
          className="mx-auto"
          style={{ width: size.w * scale, height: size.h * scale }}
        >
          <div
            className="shadow-xl rounded-sm overflow-hidden bg-white origin-top-left relative"
            style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
          >
            <Page p={p} n={i + 1} total={pages.length} />
          </div>
          <p className="text-center text-[10px] font-semibold text-gray-400 mt-1">
            Page {i + 1} of {pages.length}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

function Page({ p, n, total }: { p: ReportPage; n: number; total: number }) {
  if (p.kind === 'cover')
    return (
      <div className="absolute inset-0 text-white" style={{ background: BRAND.navy }}>
        <div className="absolute inset-y-0 right-0 w-[45%]" style={{ background: BRAND.blue, clipPath: 'polygon(0 0, 100% 0, 100% 75%)' }} />
        <div className="absolute left-[60px] top-[190px] right-[440px]">
          <div className="w-[105px] h-[6px] bg-yellow-400 mb-6" />
          <h1 className="text-[52px] font-black leading-none">{p.title}</h1>
          <p className="text-[18px] text-blue-200 mt-4">{p.subtitle}</p>
          <div className="mt-10 space-y-2.5">
            {p.meta.map(([k, v]) => (
              <p key={k} className="text-[15px]">
                <span className="inline-block w-[150px] text-[12px] font-bold text-blue-300 tracking-wider">{k.toUpperCase()}</span>
                {v}
              </p>
            ))}
          </div>
        </div>
        <div className="absolute left-[660px] top-[370px] right-[40px] text-[13px] columns-2 gap-6">
          {p.projects.map((g) => (
            <div key={g.portfolio} className="break-inside-avoid mb-3">
              <p className="font-black text-yellow-400 text-[12px] tracking-wider">{g.portfolio.toUpperCase()}</p>
              {g.names.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        className="h-[52px] shrink-0 flex items-center justify-between px-[45px] text-white"
        style={{ background: BRAND.navy, borderBottom: '3px solid #facc15' }}
      >
        <span className="text-[17px] font-black">Project Design Efficiencies</span>
        <span className="text-[14px]">
          {p.kind === 'summary'
            ? 'Summary'
            : p.kind === 'method'
              ? `How it's calculated${p.part ? ` (${p.part})` : ''}`
              : `${p.group}${p.part ? ` (${p.part})` : ''}`}
        </span>
      </div>
      <div className="flex-1 min-h-0 px-[45px] pt-[20px] overflow-hidden">
        {p.kind === 'summary' && (
          <>
            <div className="grid grid-cols-3 gap-[22px]">
              {p.cards.map((c) => (
                <div key={c.label} className="border border-slate-200 rounded-md px-4 py-3 relative">
                  <div className="absolute inset-x-0 top-0 h-[4px]" style={{ background: BRAND.blue }} />
                  <p className="text-[11px] font-black text-slate-500 tracking-wider">{c.label.toUpperCase()}</p>
                  <p className="text-[32px] font-black text-slate-800 leading-tight">
                    {c.avg} <span className="text-[12px] font-semibold text-slate-500">{c.unit} portfolio average</span>
                  </p>
                  <p className="text-[12px] text-slate-500">Range {c.range}</p>
                  <p className="text-[12px] text-emerald-800 h-[18px]">{c.best ? `Best: ${c.best}` : ''}</p>
                </div>
              ))}
            </div>
            <p className="text-[16px] font-black text-slate-800 mt-6 mb-2">Watch list — far worse than the portfolio average</p>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-white" style={{ background: BRAND.slate }}>
                  {['Project', 'Heading', 'Value', 'Portfolio avg'].map((h, i) => (
                    <th key={h} className={cn('px-3 py-1.5 font-bold', i >= 2 ? 'text-right' : 'text-left')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!p.watch.length && (
                  <tr>
                    <td className="px-3 py-2 text-slate-500" colSpan={4}>
                      Nothing stands out — every project is within the normal range.
                    </td>
                  </tr>
                )}
                {p.watch.map((w, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
                    <td className="px-3 py-1.5">{w.project}</td>
                    <td className="px-3 py-1.5">{w.heading}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-rose-600">{w.value}</td>
                    <td className="px-3 py-1.5 text-right">{w.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {p.kind === 'table' && (
          <>
            <p className="text-[19px] font-black text-slate-800 flex items-center gap-2.5 mb-2.5">
              <span className="w-[7px] h-[22px]" style={{ background: p.tone }} />
              {p.group}
            </p>
            <table className="w-full border-collapse text-[12.5px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 300 }} />
                {p.projects.map((_, i) => (
                  <col key={i} />
                ))}
                <col style={{ width: 105 }} />
              </colgroup>
              <thead>
                <tr className="text-white text-[11px] font-black">
                  <th rowSpan={2} className="text-left px-2 border border-slate-200" style={{ background: BRAND.slate }}>
                    Heading
                  </th>
                  {p.bands.map((b, i) => (
                    <th key={i} colSpan={b.span} className="py-1 border border-slate-200 tracking-wider" style={{ background: BRAND.blue }}>
                      {b.name.toUpperCase()}
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-slate-200" style={{ background: BRAND.slate }}>
                    Portfolio avg
                  </th>
                </tr>
                <tr className="bg-slate-200 text-slate-800 text-[11px] font-black">
                  {p.projects.map((x) => (
                    <th key={x} className="px-1 py-1 border border-slate-200 leading-tight">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.label} style={{ height: 36 }}>
                    <td className="px-2 border border-slate-200">
                      <p className="font-bold text-slate-800 leading-tight">{r.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{[r.unit, r.source].filter(Boolean).join(' · ')}</p>
                    </td>
                    {r.cells.map((c, i) => (
                      <td
                        key={i}
                        className={cn('px-2 border border-slate-200 text-right', (c.tone === 'best' || c.tone === 'outlier') && 'font-bold')}
                        style={{ background: c.tone ? TONE_FILL[c.tone] : undefined, color: c.tone ? TONE_TEXT[c.tone] : undefined }}
                      >
                        {c.text}
                      </td>
                    ))}
                    <td className="px-2 border border-slate-200 text-right font-bold bg-slate-100">{r.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-5 mt-3 text-[11px] text-slate-500">
              {(
                [
                  ['best', 'Best in portfolio'],
                  ['good', 'Better than most'],
                  ['bad', 'Worse than most'],
                  ['outlier', 'Far worse (red text)'],
                  ['entry', 'Looks like an entry mistake'],
                ] as const
              ).map(([k, l]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="w-[14px] h-[10px]" style={{ background: TONE_FILL[k] }} />
                  {l}
                </span>
              ))}
            </div>
          </>
        )}
        {p.kind === 'method' && (
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-white" style={{ background: BRAND.slate }}>
                {['Section', 'Heading', 'How it is calculated', 'Source module', 'Status'].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="px-2 py-1 border border-slate-200 w-[170px]">{r.group}</td>
                  <td className="px-2 py-1 border border-slate-200 w-[180px] font-bold">{r.label}</td>
                  <td className="px-2 py-1 border border-slate-200">{r.formula}</td>
                  <td className="px-2 py-1 border border-slate-200 w-[160px]">{r.source}</td>
                  <td className="px-2 py-1 border border-slate-200 w-[90px]">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="h-[30px] shrink-0 px-[45px] flex items-center justify-between text-[11px] text-slate-500">
        <span>M3M_1.O · Project Design Efficiencies</span>
        <span>
          Page {n} of {total}
        </span>
      </div>
    </div>
  )
}

/* ================================================================== bits */
function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}
function Check({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-[12px] font-semibold text-gray-700">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="accent-[#00509d]" />
      {children}
    </label>
  )
}
