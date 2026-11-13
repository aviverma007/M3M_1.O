/*
 * Module 14 (commercial 10): Façade & Envelope — any number of façade systems per project, each with configuration (A),
 * glass (B), areas (C), cost (D) and governance (E); consolidated output on the right and a summary table below.
 */
import { Fragment, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronLeft, Copy, FileUp, Info, Layers, LoaderCircle, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import { SaveProjectFooter } from '@/components/design-chapters-b/PageChrome'
import FileLink from '@/components/design-brief/FileLink'
import { errorMessage, saveSummary, uploadFile, useSummaryLoader } from '@/api/chapters-b'
import { fmtNum } from '@/lib/projectComparison'
import {
  SECTIONS,
  areaWarnings,
  facadeContextOf,
  facadeSummary,
  isRequired,
  missingMandatory,
  newSystem,
  newSystemId,
  normalizeFacade,
  sectionVisible,
  systemOutputs,
  systemTitle,
  visible,
  type FField,
  type FacadeData,
  type FacadeSystem,
} from '@/lib/facade'
import { cn } from '@/lib/utils'

const dash = (v: number | null, dp: number) => (v === null ? '--' : fmtNum(v, dp))

export default function FacadeForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<FacadeData>({ version: 2, systems: [], remarks: '' })
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showErrors, setShowErrors] = useState(false)
  const cards = useRef<Record<string, HTMLDivElement | null>>({})

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      setSummary((s as Record<string, unknown>) ?? null)
      const d = normalizeFacade(s?.facadeData)
      setData(d)
      if (d.systems.length) setOpen({ [d.systems[0].id]: true })
    },
    { label: 'façade data' },
  )

  const ctx = facadeContextOf(summary)
  const sum = facadeSummary(data, ctx)
  const missing = missingMandatory(data)

  const setSystem = (id: string, patch: Partial<FacadeSystem>) => setData((d) => ({ ...d, systems: d.systems.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const add = () => {
    const s = newSystem()
    setData((d) => ({ ...d, systems: [...d.systems, s] }))
    setOpen((o) => ({ ...o, [s.id]: true }))
    setTimeout(() => cards.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const duplicate = (s: FacadeSystem) => {
    const c: FacadeSystem = { ...structuredClone(s), id: newSystemId(), name: s.name ? `${s.name} (copy)` : 'Copy', documents: [] }
    setData((d) => ({ ...d, systems: [...d.systems, c] }))
    setOpen((o) => ({ ...o, [c.id]: true }))
  }
  const remove = (id: string) => setData((d) => ({ ...d, systems: d.systems.filter((s) => s.id !== id) }))

  const save = async () => {
    if (missing.length) {
      setShowErrors(true)
      const first = data.systems[missing[0].system]
      setOpen((o) => ({ ...o, [first.id]: true }))
      setTimeout(() => cards.current[first.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      toast.error(`Fill the mandatory fields (*) first: ${missing.slice(0, 3).map((m) => `System ${m.system + 1} — ${m.label}`).join('; ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`)
      return
    }
    setSaving(true)
    try {
      await saveSummary(projectId!, { facadeData: data })
      toast.success('Façade & Envelope saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving façade data:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 w-full">
      <div className="w-full bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-[#00509d] hover:bg-[#00509d] hover:text-white transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Façade &amp; Envelope</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Façade systems · Glass specification &amp; performance · Areas · Cost · Governance</p>
        </div>
        <p className="text-[11px] text-gray-500">
          <span className="text-red-500 font-bold">*</span> mandatory · <span className="text-[#00509d] font-bold">●</span> recommended
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-24">
        <div className="xl:col-span-3 space-y-5 min-w-0">
          {data.systems.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-blue-200 p-10 text-center">
              <Layers className="mx-auto text-[#00509d]" size={28} />
              <p className="mt-3 font-bold text-gray-800">No façade systems yet</p>
              <p className="text-sm text-gray-500 mt-1">Add one system per façade type, e.g. a unitised curtain wall for the towers and a sliding window system for the units.</p>
            </div>
          )}

          {data.systems.map((s, i) => (
            <SystemCard
              key={s.id}
              refEl={(el) => (cards.current[s.id] = el)}
              s={s}
              index={i}
              open={!!open[s.id]}
              onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
              onChange={(p) => setSystem(s.id, p)}
              onRemove={() => remove(s.id)}
              onDuplicate={() => duplicate(s)}
              showErrors={showErrors}
              saleable={ctx.saleable}
            />
          ))}

          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#00509d]/40 bg-white py-4 text-[#00509d] font-bold hover:bg-blue-50 transition-colors"
          >
            <Plus size={18} /> Add Façade System
          </button>

          {data.systems.length > 0 && <SummaryTable data={data} saleable={ctx.saleable} />}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-1.5">
            <label htmlFor="facade-remarks" className="text-xs font-semibold text-gray-600">
              Project remarks
            </label>
            <textarea
              id="facade-remarks"
              value={data.remarks ?? ''}
              onChange={(e) => setData((d) => ({ ...d, remarks: e.target.value }))}
              rows={3}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="xl:col-span-2 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
            <div className="bg-[#1A3566] px-6 py-3 flex items-center justify-between">
              <h2 className="text-white font-semibold uppercase tracking-wider text-xs">Calculated Output</h2>
              <span className="text-[10px] text-blue-200">{sum.systems} system{sum.systems === 1 ? '' : 's'}</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <Out label="Total Façade Area" v={dash(sum.facadeArea, 0)} unit="sq ft" note={sum.module6WallArea ? `Module 6 Total External Wall Area: ${fmtNum(sum.module6WallArea, 0)} sq ft` : 'sum of the systems’ external wall areas'} />
                <Out label="Total Glazed Area" v={dash(sum.glazedArea, 0)} unit="sq ft" />
                <Out label="Total Opaque Area" v={dash(sum.opaqueArea, 0)} unit="sq ft" />
                <Out label="Glazing % / WWR" v={dash(sum.wwr, 1)} unit="%" note="glazed area ÷ external wall area" />
                <Out label="Average SHGC" v={dash(sum.avgShgc, 2)} unit="" note="weighted by glazed area; shown when every glazed system has an SHGC" />
                <Out label="Glass U-Value (centre of glass)" v={dash(sum.avgUCentre, 2)} unit="W/m²K" note="weighted by glazed area" />
                <Out label="SHGC-Weighted Glazed Area" v={dash(sum.shgcWeightedArea, 0)} unit="sq ft" note="glazed area × SHGC" />
                <Out label="Façade Cost" v={dash(sum.costCr, 2)} unit="Rs. Cr" />
                <Out label="Façade Cost per sq ft of Façade Area" v={dash(sum.costPerSqftFacade, 0)} unit="Rs./sq ft" />
                <Out
                  label="Façade Cost per sq ft of Saleable Area"
                  v={dash(sum.costPerSqftSaleable, 0)}
                  unit="Rs./sq ft"
                  note={ctx.saleable ? `saleable ${fmtNum(ctx.saleable, 0)} sq ft (Module 6)` : 'needs Module 6 Saleable Area'}
                />
              </tbody>
            </table>
            {sum.mixedScope && (
              <p className="flex gap-2 text-[11px] text-amber-800 bg-amber-50 p-4 border-t border-amber-100">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Costs are entered on different bases ({sum.mixedScope}). Use the same commercial stage and GST basis for a fair total and comparison.
              </p>
            )}
            {sum.module6WallArea && sum.facadeArea && sum.facadeArea > sum.module6WallArea * 1.02 && (
              <p className="flex gap-2 text-[11px] text-amber-800 bg-amber-50 p-4 border-t border-amber-100">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                The systems add up to more façade area than Module 6’s Total External Wall Area. An area may be counted in two systems.
              </p>
            )}
            <p className="flex gap-2 text-[11px] text-gray-500 p-4 bg-slate-50 border-t">
              <Info size={14} className="shrink-0 mt-0.5 text-[#00509d]" />
              &quot;--&quot; means the inputs needed for that figure are not entered yet. Performance values are what you enter from the approved glass datasheet; nothing is assumed from SGU / DGU.
            </p>
          </div>
        </div>
      </div>

      <SaveProjectFooter saving={saving} onSave={save} innerClassName="w-full px-6 flex justify-end gap-3" />
    </div>
  )
}

/* ------------------------------------------------------------------ one system */
function SystemCard({
  s,
  index,
  open,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
  showErrors,
  saleable,
  refEl,
}: {
  s: FacadeSystem
  index: number
  open: boolean
  onToggle: () => void
  onChange: (p: Partial<FacadeSystem>) => void
  onRemove: () => void
  onDuplicate: () => void
  showErrors: boolean
  saleable: number | null
  refEl: (el: HTMLDivElement | null) => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const o = systemOutputs(s, saleable)
  const warn = areaWarnings(s)
  const missing = SECTIONS.flatMap((sec) => (sectionVisible(sec, s) ? sec.fields.filter((f) => isRequired(f, s) && isBlank(s[f.key])) : []))
  return (
    <div ref={refEl} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-28">
      <div className="bg-[#00509d] text-white px-5 py-3 flex flex-wrap items-center gap-3">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left" aria-expanded={open}>
          <ChevronDown size={18} className={cn('shrink-0 transition-transform', !open && '-rotate-90')} />
          <span className="font-bold text-sm truncate">{systemTitle(s, index)}</span>
        </button>
        <span className="text-[11px] text-blue-100 whitespace-nowrap">
          {o.wall !== null ? `${fmtNum(o.wall, 0)} sq ft` : ''}
          {o.wwr !== null ? ` · WWR ${fmtNum(o.wwr, 1)}%` : ''}
          {o.costCr !== null ? ` · Rs. ${fmtNum(o.costCr, 2)} Cr` : ''}
        </span>
        {showErrors && missing.length > 0 && <span className="text-[10px] font-bold bg-red-500 rounded-full px-2 py-0.5">{missing.length} mandatory missing</span>}
        <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-white/15" title="Duplicate this system">
          <Copy size={15} />
        </button>
        {confirm ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold">
            Delete?
            <button onClick={onRemove} className="px-2 py-0.5 rounded bg-red-500 hover:bg-red-600">
              Yes
            </button>
            <button onClick={() => setConfirm(false)} className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30">
              No
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="p-1.5 rounded hover:bg-white/15" title="Delete this system">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {open && (
        <div className="divide-y divide-gray-100">
          {SECTIONS.filter((sec) => sectionVisible(sec, s)).map((sec) => (
            <div key={sec.id}>
              <button
                onClick={() => setClosed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
                className="w-full flex items-center gap-2 px-6 py-3 bg-blue-50/40 hover:bg-blue-50 text-left"
                aria-expanded={!closed[sec.id]}
              >
                <ChevronDown size={15} className={cn('text-[#00509d] transition-transform', closed[sec.id] && '-rotate-90')} />
                <span className="text-[12px] font-black uppercase tracking-wider text-[#1A3566]">{sec.title}</span>
              </button>
              {!closed[sec.id] && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sec.fields
                    .filter((f) => visible(f, s))
                    .map((f) => (
                      <Field key={f.key} f={f} s={s} onChange={onChange} error={showErrors && isRequired(f, s) && isBlank(s[f.key])} sysId={s.id} />
                    ))}
                  {sec.id === 'C' && (
                    <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px] bg-slate-50 rounded-lg px-4 py-3">
                      <span>
                        WWR <b className="text-[#1A3566]">{dash(o.wwr, 1)}%</b>
                      </span>
                      <span>
                        Opaque <b className="text-[#1A3566]">{dash(o.opaquePct, 1)}%</b>
                      </span>
                      {warn.map((w) => (
                        <span key={w} className="w-full text-amber-700 flex gap-1.5">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {w}
                        </span>
                      ))}
                    </div>
                  )}
                  {sec.id === 'D' && (
                    <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px] bg-slate-50 rounded-lg px-4 py-3">
                      <span>
                        Rs./sq ft façade <b className="text-[#1A3566]">{dash(o.costPerSqftFacade, 0)}</b>
                      </span>
                      <span>
                        Rs./sq ft saleable <b className="text-[#1A3566]">{dash(o.costPerSqftSaleable, 0)}</b>
                      </span>
                      <span>
                        Glass Rs./sq ft glazed <b className="text-[#1A3566]">{dash(o.glassCostPerSqft, 0)}</b>
                      </span>
                    </div>
                  )}
                  {sec.id === 'E' && <Documents s={s} onChange={onChange} />}
                </div>
              )}
            </div>
          ))}
          <div className="p-6 space-y-1.5">
            <label htmlFor={`${s.id}-remarks`} className="text-xs font-semibold text-gray-600">
              System remarks
            </label>
            <textarea
              id={`${s.id}-remarks`}
              value={s.remarks ?? ''}
              onChange={(e) => onChange({ remarks: e.target.value })}
              rows={2}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

function Field({ f, s, onChange, error, sysId }: { f: FField; s: FacadeSystem; onChange: (p: Partial<FacadeSystem>) => void; error: boolean; sysId: string }) {
  const id = `${sysId}-${f.key}`
  const v = s[f.key]
  const req = isRequired(f, s)
  const label = (
    <label htmlFor={id} className="text-xs font-semibold text-gray-600 flex items-center gap-1">
      {f.label}
      {req && <span className="text-red-500 font-bold">*</span>}
      {f.need === 'recommended' && <span className="text-[#00509d] text-[9px]" title="Recommended">●</span>}
      {f.unit && f.type !== 'number' && <span className="text-gray-400 font-normal">({f.unit})</span>}
    </label>
  )
  const ring = error ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
  if (f.type === 'multi') {
    const list = Array.isArray(v) ? (v as string[]) : []
    return (
      <div className="space-y-1.5 md:col-span-2">
        {label}
        <div className="flex flex-wrap gap-1.5" id={id}>
          {(f.options ?? []).map((opt) => {
            const on = list.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ [f.key]: on ? list.filter((x) => x !== opt) : opt === 'None' ? ['None'] : [...list.filter((x) => x !== 'None'), opt] } as Partial<FacadeSystem>)}
                aria-pressed={on}
                className={cn('px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors', on ? 'bg-[#00509d] text-white border-[#00509d]' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  if (f.type === 'select' || f.type === 'yesno')
    return (
      <div className="space-y-1.5">
        {label}
        <Select value={String(v ?? '')} onValueChange={(x) => onChange({ [f.key]: x } as Partial<FacadeSystem>)}>
          <SelectTrigger id={id} className={cn('h-10 data-[size=default]:h-10 text-[12px] bg-white rounded-lg w-full', ring)}>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-80">
            {(f.options ?? []).map((o) => (
              <SelectItem key={o} value={o} className="text-[12px]">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {f.hint && <p className="text-[10px] text-gray-400">{f.hint}</p>}
      </div>
    )
  return (
    <div className={cn('space-y-1.5', f.key === 'name' && 'md:col-span-2')}>
      {label}
      <div className="relative">
        <Input
          id={id}
          value={String(v ?? '')}
          onChange={(e) => onChange({ [f.key]: f.type === 'number' ? e.target.value.replace(/[^0-9.\-]/g, '') : e.target.value } as Partial<FacadeSystem>)}
          inputMode={f.type === 'number' ? 'decimal' : undefined}
          placeholder={f.type === 'number' ? '0' : ''}
          className={cn('h-10 text-[12px] bg-white rounded-lg', ring, f.unit && 'pr-16')}
        />
        {f.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold italic text-gray-400">{f.unit}</span>}
      </div>
      {f.hint && <p className="text-[10px] text-gray-400">{f.hint}</p>}
    </div>
  )
}

function Documents({ s, onChange }: { s: FacadeSystem; onChange: (p: Partial<FacadeSystem>) => void }) {
  const [busy, setBusy] = useState(false)
  const docs = s.documents ?? []
  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const added = []
      for (const f of Array.from(files)) {
        const url = await uploadFile(f)
        if (url) added.push({ name: f.name, url })
      }
      onChange({ documents: [...docs, ...added] })
      if (added.length) toast.success(`${added.length} file${added.length === 1 ? '' : 's'} attached`)
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="md:col-span-2 space-y-2">
      <p className="text-xs font-semibold text-gray-600">Supporting documents &amp; drawings</p>
      <div className="flex flex-wrap gap-2">
        {docs.map((d, i) => (
          <span key={`${d.url}-${i}`} className="inline-flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1 py-1">
            <Paperclip size={12} className="text-gray-400" />
            <FileLink href={d.url} mode="view" className="font-semibold text-[#00509d] hover:underline max-w-[220px] truncate">
              {d.name}
            </FileLink>
            <button onClick={() => onChange({ documents: docs.filter((_, j) => j !== i) })} className="p-0.5 rounded-full hover:bg-slate-200" title="Remove">
              <X size={12} />
            </button>
          </span>
        ))}
        <label className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00509d] border border-dashed border-blue-300 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-50', busy && 'opacity-60 pointer-events-none')}>
          {busy ? <LoaderCircle size={12} className="animate-spin" /> : <FileUp size={12} />} Upload
          <input type="file" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
        </label>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ consolidated summary table */
function SummaryTable({ data, saleable }: { data: FacadeData; saleable: number | null }) {
  const sum = facadeSummary(data, { saleable })
  const th = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left whitespace-nowrap'
  const td = 'px-3 py-2.5 text-[12px] whitespace-nowrap'
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#1A3566] px-6 py-3">
        <h2 className="text-white font-semibold uppercase tracking-wider text-xs">Project Summary — all façade systems</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 text-gray-500">
            <tr>
              <th className={th}>System</th>
              <th className={th}>Glazing</th>
              <th className={cn(th, 'text-right')}>Wall area</th>
              <th className={cn(th, 'text-right')}>Glazed</th>
              <th className={cn(th, 'text-right')}>WWR %</th>
              <th className={cn(th, 'text-right')}>U / SHGC / VLT</th>
              <th className={cn(th, 'text-right')}>Cost Cr</th>
              <th className={cn(th, 'text-right')}>Rs./sq ft</th>
              <th className={th}>Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.systems.map((s, i) => {
              const o = systemOutputs(s, saleable)
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td className={cn(td, 'font-semibold text-gray-800 whitespace-normal min-w-[200px]')}>{systemTitle(s, i)}</td>
                    <td className={td}>{(s.glazingConfig ?? '').split(' ')[0] || '--'}</td>
                    <td className={cn(td, 'text-right')}>{dash(o.wall, 0)}</td>
                    <td className={cn(td, 'text-right')}>{dash(o.glazed, 0)}</td>
                    <td className={cn(td, 'text-right')}>{dash(o.wwr, 1)}</td>
                    <td className={cn(td, 'text-right')}>{[s.uCentre, s.shgc, s.vlt].map((x) => x || '--').join(' / ')}</td>
                    <td className={cn(td, 'text-right')}>{dash(o.costCr, 2)}</td>
                    <td className={cn(td, 'text-right')}>{dash(o.costPerSqftFacade, 0)}</td>
                    <td className={td}>{s.designStage || '--'}</td>
                  </tr>
                </Fragment>
              )
            })}
            <tr className="bg-blue-50/50 font-bold">
              <td className={td}>Project total</td>
              <td className={td} />
              <td className={cn(td, 'text-right')}>{dash(sum.facadeArea, 0)}</td>
              <td className={cn(td, 'text-right')}>{dash(sum.glazedArea, 0)}</td>
              <td className={cn(td, 'text-right')}>{dash(sum.wwr, 1)}</td>
              <td className={cn(td, 'text-right')}>{[dash(sum.avgUCentre, 2), dash(sum.avgShgc, 2), dash(sum.avgVlt, 0)].join(' / ')}</td>
              <td className={cn(td, 'text-right')}>{dash(sum.costCr, 2)}</td>
              <td className={cn(td, 'text-right')}>{dash(sum.costPerSqftFacade, 0)}</td>
              <td className={td} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Out({ label, v, unit, note }: { label: string; v: string; unit: string; note?: string }) {
  return (
    <tr>
      <td className="px-5 py-3">
        <p className="font-semibold text-gray-700">{label}</p>
        {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
      </td>
      <td className="px-5 py-3 text-right whitespace-nowrap">
        <span className={cn('font-black text-sm', v === '--' ? 'text-gray-300' : 'text-[#1A3566]')}>{v}</span>
        {unit && <span className="text-[10px] text-gray-400 ml-1.5">{unit}</span>}
      </td>
    </tr>
  )
}

