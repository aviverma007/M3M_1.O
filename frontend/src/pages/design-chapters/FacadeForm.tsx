/* Module 14 (commercial 10): Façade & Envelope — system, glass performance, areas & cost, with live outputs. */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import { SaveProjectFooter } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import { http } from '@/api/http'
import { fmtNum } from '@/lib/projectComparison'
import { FACADE_SECTIONS, facadeContextOf, facadeOutputs, type FacadeData, type FacadeField } from '@/lib/facade'
import { cn } from '@/lib/utils'

export default function FacadeForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<FacadeData>({})
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [mep, setMep] = useState<Record<string, unknown> | null>(null)

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      setSummary((s as Record<string, unknown>) ?? null)
      if (s?.facadeData) setValues(s.facadeData as FacadeData)
    },
    { label: 'façade data' },
  )
  useEffect(() => {
    if (!projectId) return
    http
      .get<{ data: { data?: Record<string, unknown>[] } }>(`/mep?projectId=${projectId}`)
      .then((r) => setMep(r?.data?.data?.[0] ?? null))
      .catch(() => setMep(null))
  }, [projectId])

  const set = (k: keyof FacadeData, v: string) => setValues((p) => ({ ...p, [k]: v }))
  const ctx = facadeContextOf(summary, mep)
  const out = facadeOutputs(values, ctx)

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { facadeData: values })
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
      <div className="w-full bg-white mb-6 p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-[#00509d] hover:bg-[#00509d] hover:text-white transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Façade &amp; Envelope</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Façade system · Glass performance · Areas &amp; cost</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-24">
        <div className="xl:col-span-3 space-y-6">
          {FACADE_SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#00509d] px-6 py-3">
                <h2 className="text-white font-semibold uppercase tracking-wider text-xs">{sec.title}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {sec.fields.map((f) => (
                  <Field key={f.key} f={f} values={values} onChange={set} placeholder={f.key === 'facadeArea' && ctx.externalWallArea ? fmtNum(ctx.externalWallArea, 0) : undefined} />
                ))}
              </div>
            </div>
          ))}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Remarks</label>
            <textarea
              value={values.remarks ?? ''}
              onChange={(e) => set('remarks', e.target.value)}
              rows={3}
              placeholder="e.g. Unitised DGU on the golf-facing side, punched windows elsewhere"
              className="w-full text-sm bg-white border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-28">
            <div className="bg-[#1A3566] px-6 py-3">
              <h2 className="text-white font-semibold uppercase tracking-wider text-xs">Calculated Output</h2>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <Out label="Façade Area used" value={out.facadeArea} unit="sq ft" dp={0} note={out.facadeAreaFromModule6 ? 'from Module 6 Total External Wall Area' : undefined} />
                <Out label="Glazing %" value={out.glazingPct} unit="%" dp={1} note="glazed area ÷ façade area" />
                <Out label="Façade Cost" value={out.totalCost !== null ? out.totalCost / 1e7 : null} unit="Rs. Cr" dp={2} />
                <Out label="Façade Cost per sq ft Saleable" value={out.costPerSaleable} unit="Rs./sq ft" dp={0} note={ctx.saleable ? `saleable ${fmtNum(ctx.saleable, 0)} sq ft (Module 6)` : 'needs Module 6 Saleable Area'} />
                <Out label="Effective Glass Area" value={out.effectiveGlass} unit="sq ft" dp={0} note="glazed area × SHGC" />
                <Out label="Heat-Gain Index" value={out.heatGainIndex} unit="per 1,000 sq ft saleable" dp={1} note="effective glass per 1,000 sq ft saleable — lower is cooler" />
                <Out
                  label="Glass Load per TR"
                  value={out.glassPerTR}
                  unit="sq ft/TR"
                  dp={1}
                  note={ctx.coolingTR ? `apartment cooling ${fmtNum(ctx.coolingTR, 0)} TR (MEP tonnage × units)` : 'needs MEP Tonnage per Apartment and Module 6 No. of Units'}
                />
              </tbody>
            </table>
            <p className="flex gap-2 text-[11px] text-gray-500 p-4 bg-slate-50 border-t">
              <Info size={14} className="shrink-0 mt-0.5 text-[#00509d]" />
              Heat-gain figures compare projects with each other: more glass, or glass with a higher SHGC, means more sun heat inside and a bigger air-conditioning load.
            </p>
          </div>
        </div>
      </div>

      <SaveProjectFooter saving={saving} onSave={save} innerClassName="w-full px-6 flex justify-end gap-3" />
    </div>
  )
}

function Field({ f, values, onChange, placeholder }: { f: FacadeField; values: FacadeData; onChange: (k: keyof FacadeData, v: string) => void; placeholder?: string }) {
  const v = String(values[f.key] ?? '')
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600">{f.label}</label>
      {f.kind === 'select' ? (
        <>
          <Select value={v} onValueChange={(x) => onChange(f.key, x)}>
            <SelectTrigger className="h-10 data-[size=default]:h-10 text-[12px] bg-white border-gray-200 rounded-lg w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {(f.options ?? []).map((o) => (
                <SelectItem key={o} value={o} className="text-[12px]">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {f.key === 'facadeSystem' && v === 'Other' && (
            <Input value={values.facadeSystemOther ?? ''} onChange={(e) => onChange('facadeSystemOther', e.target.value)} placeholder="Specify façade system" className="h-10 text-[12px]" />
          )}
        </>
      ) : (
        <div className="relative">
          <Input
            value={v}
            onChange={(e) => onChange(f.key, e.target.value)}
            inputMode={f.kind === 'number' ? 'decimal' : undefined}
            placeholder={placeholder ?? (f.kind === 'number' ? '0' : '')}
            className={cn('h-10 text-[12px] bg-white border-gray-200 rounded-lg', f.unit && 'pr-20')}
          />
          {f.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold italic text-gray-400">{f.unit}</span>}
        </div>
      )}
      {f.hint && <p className="text-[10px] text-gray-400">{f.hint}</p>}
    </div>
  )
}

function Out({ label, value, unit, dp, note }: { label: string; value: number | null; unit: string; dp: number; note?: string }) {
  return (
    <tr>
      <td className="px-5 py-3">
        <p className="font-semibold text-gray-700">{label}</p>
        {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
      </td>
      <td className="px-5 py-3 text-right whitespace-nowrap">
        <span className={cn('font-black text-sm', value === null ? 'text-gray-300' : 'text-[#1A3566]')}>{value === null ? '—' : fmtNum(value, dp)}</span>
        <span className="text-[10px] text-gray-400 ml-1.5">{unit}</span>
      </td>
    </tr>
  )
}
