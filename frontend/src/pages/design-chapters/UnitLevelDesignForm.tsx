/* Unit Level Design: /dashboard/project/:projectId/design-chapters/unit-level-design (original UnitLevelDesignForm). */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, ChevronLeft, ChevronUp, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageLoader from '@/components/common/PageLoader'
import { cn } from '@/lib/utils'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, useBenchmarks } from '@/lib/benchmark'
import { errorMessage, getSummary, saveSummary, uploadFile } from '@/api/chapters-a'
import type { Typology } from '@/types/chapters-a'
import { calcValue, efficiencies } from '@/lib/unitLevelCalc'

const n = (v: unknown) => parseFloat(String(v ?? '')) || 0

/** stored "grid" (same derivation as the original, saved with each typology) */
function buildGrid(t: Typology) {
  const s = t.saleableArea || ''
  const r = t.coveredArea || ''
  const uf = t.unitFar || ''
  const bnf = t.balconyAreaNonFar || ''
  const bf = t.balconyAreaFar || ''
  const c = t.carpetArea || ''
  const w = t.wallArea || ''
  const ac = t.acArea || ''
  const circ = t.circulationFar || ''
  const pf = t.permissibleFar || ''
  const iw = t.internalWallThickness || ''
  const cw = t.commonWallThickness || ''
  const balc = n(bf) + n(bnf)
  const totalArea = n(r) + balc
  const farPlusBal = n(uf) + n(bf)
  const totalFar = farPlusBal + n(circ)
  const hasBal = bf !== '' || bnf !== ''
  return {
    'Permissible Far': { bua: pf, sa: pf, ca: pf },
    'Unit FAR (exc. Balcony)': { bua: uf, sa: s, ca: c },
    'Balcony Area (FAR)': { bua: bf, sa: bf, ca: bf ? '0' : '' },
    'Core Area (Non Saleable FAR)': { bua: circ, sa: circ, ca: circ ? '0' : '' },
    'Balcony FAR + Unit Far': { bua: uf !== '' || bf !== '' ? String(farPlusBal) : '', sa: s, ca: c },
    'Total Unit FAR (Unit + Balcony + Circulation)': {
      bua: uf !== '' || bf !== '' || circ !== '' ? String(totalFar) : '',
      sa: s !== '' || circ !== '' ? String(n(s) + n(circ)) : '',
      ca: c,
    },
    'Unit Covered Area': { bua: r, sa: s, ca: c },
    'Balcony Area (FAR + Non-FAR)': { bua: hasBal ? String(balc) : '', sa: hasBal ? String(balc) : '', ca: hasBal ? '0' : '' },
    'Total Unit Area (Covered + Balcony)': { bua: r !== '' || bf !== '' || bnf !== '' ? String(totalArea) : '', sa: s, ca: c },
    'Wall Area': { bua: w, sa: w, ca: w ? '0' : '' },
    'AC Area': { bua: ac, sa: ac, ca: ac },
    'Internal Wall Thickness': { bua: iw, sa: iw, ca: iw },
    'Common Wall Thickness': { bua: cw, sa: cw, ca: cw },
  }
}

function newTypology(index: number): Typology {
  const t: Typology = {
    id: Date.now(),
    name: `Type ${index}`,
    type: '',
    noOfUnits: '',
    saleableArea: '',
    coveredArea: '',
    unitFar: '',
    balconyAreaNonFar: '',
    balconyAreaFar: '',
    carpetArea: '',
    coreArea: '',
    unitsPerCore: '',
    internalWallThickness: '',
    commonWallThickness: '',
    wallArea: '',
    acArea: '',
    circulationFar: '',
    permissibleFar: '',
    plan: null,
    keyPlan: null,
    isOpen: true,
  }
  t.grid = buildGrid(t)
  return t
}

const FIELDS_A = [
  { label: 'Unit Saleable Area', key: 'saleableArea', unit: 'sq ft' },
  { label: 'Unit Covered Area', key: 'coveredArea', unit: 'sq ft' },
  { label: 'Unit FAR', key: 'unitFar', unit: 'sq ft' },
  { label: 'Balcony Area (Non FAR)', key: 'balconyAreaNonFar', unit: 'sq ft' },
  { label: 'Balcony Area (FAR)', key: 'balconyAreaFar', unit: 'sq ft' },
] as const
const FIELDS_B = [
  { label: 'RERA Carpet Area', key: 'carpetArea', unit: 'sq ft' },
  { label: 'Units Per Core', key: 'unitsPerCore', unit: '#' },
  { label: 'Wall area (Unit external wall Area)', key: 'wallArea', unit: 'sq ft' },
  { label: 'AC Area', key: 'acArea', unit: 'sq ft' },
  { label: 'Core Area (Non Saleable FAR)', key: 'circulationFar', unit: 'sq ft' },
] as const
const FAR_ROWS = ['Unit FAR (exc. Balcony)', 'Balcony Area (FAR)', 'Core Area (Non Saleable FAR)', 'Balcony FAR + Unit Far']
const AREA_ROWS = ['Unit Covered Area', 'Balcony Area (FAR + Non-FAR)', 'Total Unit Area (Covered + Balcony)', 'Wall Area', 'AC Area']
const EFF_ROWS = ['CA/SA', 'Balcony/SA', 'Core Area Efficiency', 'Unit Area (Covered + Balcony) to Saleable']

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wider'
const INPUT = 'h-9 text-sm bg-gray-50 border-gray-100 focus:bg-white'
const UNIT = 'absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-normal uppercase italic'
const TH_FIRST = 'px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest border-r border-white/10 sticky left-0 z-10 bg-[#00509d] w-1/3'
const TH = 'px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest border-r border-white/10 min-w-[120px]'
const GROUP_TD = 'px-4 py-2 font-black text-[#00509d] text-[10px] uppercase tracking-widest italic border-r border-b sticky left-0 z-10 bg-gray-50'

const SCROLLBAR_CSS = `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `

export default function UnitLevelDesignForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const planRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const keyPlanRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [types, setTypes] = useState<Typology[]>(() => {
    const t = newTypology(1)
    t.name = 'Type 1'
    return [t]
  })
  const benchmarks = useBenchmarks()

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getSummary(projectId!)
        if (Array.isArray(s?.unitLevelDesignData) && s.unitLevelDesignData.length > 0) setTypes(s.unitLevelDesignData)
      } catch (e) {
        console.error('Error fetching unit level design data:', e)
        toast.error('Failed to load unit level design data')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const update = (id: number, key: keyof Typology, value: unknown) => setTypes((ts) => ts.map((t) => (t.id !== id ? t : { ...t, [key]: value })))
  const add = () => setTypes((ts) => [...ts.map((t) => ({ ...t, isOpen: false })), newTypology(ts.length + 1)])
  const remove = (id: number) => types.length > 1 && setTypes(types.filter((t) => t.id !== id))
  const toggle = (id: number) => setTypes(types.map((t) => (t.id === id ? { ...t, isOpen: !t.isOpen } : t)))

  const upload = async (e: React.ChangeEvent<HTMLInputElement>, id: number, key: 'plan' | 'keyPlan') => {
    const file = e.target.files?.[0]
    if (!file) return
    const what = key === 'plan' ? 'typology plan' : 'key plan'
    const tid = toast.loading(`Uploading ${what}...`)
    try {
      const url = await uploadFile(file)
      if (!url) throw new Error(`Failed to upload ${what} to S3`)
      update(id, key, url)
      toast.success(key === 'plan' ? 'Typology plan uploaded!' : 'Key plan uploaded!', { id: tid })
    } catch (err) {
      console.error(`Error uploading ${what}:`, err)
      toast.error(`Failed to upload ${what}`, { id: tid })
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { unitLevelDesignData: types })
      toast.success('Unit Level Design Saved Successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving unit level design:', e)
      toast.error(errorMessage(e, 'Failed to save Unit Level Design'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const field = (t: Typology, f: { label: string; key: string; unit: string }) => (
    <div key={f.key} className="space-y-1.5">
      <label className={LABEL}>{f.label}</label>
      <div className="relative">
        <Input value={String(t[f.key as keyof Typology] ?? '')} onChange={(e) => update(t.id, f.key as keyof Typology, e.target.value)} placeholder="0" className={`${INPUT} pr-12`} />
        <span className={UNIT}>{f.unit}</span>
      </div>
    </div>
  )
  const uploadBox = (t: Typology, key: 'plan' | 'keyPlan') => {
    const isPlan = key === 'plan'
    const refs = isPlan ? planRefs : keyPlanRefs
    const c = isPlan
      ? { box: 'border-blue-200 hover:bg-blue-50', icon: 'text-blue-500', text: 'text-blue-600' }
      : { box: 'border-green-200 hover:bg-green-50', icon: 'text-green-500', text: 'text-green-600' }
    return (
      <div className="space-y-1.5">
        <label className={LABEL}>{isPlan ? 'Typology Plan' : 'Key Plan'}</label>
        <input type="file" ref={(el) => void (refs.current[t.id] = el)} className="hidden" onChange={(e) => upload(e, t.id, key)} />
        <div
          onClick={() => refs.current[t.id]?.click()}
          className={`border-2 border-dashed ${c.box.split(' ')[0]} rounded-lg p-3 bg-gray-50 ${c.box.split(' ')[1]} transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group`}
        >
          <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Upload size={14} className={c.icon} />
          </div>
          <span className={`text-[10px] font-bold ${c.text} uppercase tracking-tight`}>
            {isPlan ? (t.plan ? 'Replace Typology Layout' : 'Upload Typology Layout') : t.keyPlan ? 'Replace Key Plan' : 'Upload Key Plan'}
          </span>
          {t[key] && <span className="text-[9px] text-gray-400 italic max-w-[150px] truncate">✓ Uploaded</span>}
        </div>
      </div>
    )
  }
  const headRow = (
    <thead>
      <tr className="bg-[#00509d] text-white">
        <th className={TH_FIRST}>UNIT TYPE NAME</th>
        {types.map((t) => (
          <th key={t.id} className={TH}>
            {t.name}
          </th>
        ))}
      </tr>
    </thead>
  )
  const groupRow = (label: string) => (
    <tr className="bg-gray-50">
      <td className={GROUP_TD}>{label}</td>
      {types.map((t) => (
        <td key={t.id} className="border-b border-r bg-gray-50" />
      ))}
    </tr>
  )
  const calcRows = (rows: string[]) =>
    rows.map((r, i) => (
      <tr key={i} className="hover:bg-blue-50/30 transition-colors border-b">
        <td className="px-6 py-3 font-semibold text-gray-600 text-xs border-r sticky left-0 z-10 bg-white">{r}</td>
        {types.map((t) => (
          <td key={t.id} className="px-4 py-3 text-center font-bold text-[#00509d] text-xs border-r min-w-[120px]">
            {calcValue(t, r)}
          </td>
        ))}
      </tr>
    ))

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1600px] mx-auto mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-[#00509d] hover:text-blue-800 font-semibold transition-colors mb-4 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Unit Level Design</span>
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unit Level Design</h1>
            <p className="text-sm text-gray-500 mt-1">Configure unit-level parameters and view efficiency calculations</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Typologies */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Typologies</h2>
              <Button size="sm" onClick={add} className="bg-[#4caf50] hover:bg-[#43a047] text-white text-xs font-bold gap-1.5 h-8 px-3 rounded-md shadow-sm border-none">
                <Plus size={14} /> Add Typology
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-gray-50/50">
              {types.map((t) => {
                const bf = n(t.balconyAreaFar)
                const bnf = n(t.balconyAreaNonFar)
                const total = bf + bnf
                return (
                  <div key={t.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
                    <div
                      className={cn('px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors', t.isOpen ? 'bg-blue-50/50 border-b' : '')}
                      onClick={() => toggle(t.id)}
                    >
                      <input
                        value={t.name}
                        onChange={(e) => update(t.id, 'name', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-blue-900 text-sm bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none px-1 min-w-[80px]"
                      />
                      <div className="flex items-center gap-3">
                        {types.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              remove(t.id)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {t.isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </div>
                    {t.isOpen && (
                      <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className={LABEL}>Type</label>
                            <Input value={t.type} onChange={(e) => update(t.id, 'type', e.target.value)} placeholder="2BHK + S" className={INPUT} />
                          </div>
                          <div className="space-y-1.5">
                            <label className={LABEL}>No. of Units</label>
                            <Input value={t.noOfUnits} onChange={(e) => update(t.id, 'noOfUnits', e.target.value)} placeholder="60" className={INPUT} />
                          </div>
                        </div>
                        <div className="space-y-4 pt-2">
                          {FIELDS_A.map((f) => field(t, f))}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Total Balcony Area</label>
                            <div className="relative">
                              <div className="h-9 flex items-center px-3 pr-12 rounded-md border border-blue-100 bg-blue-50 text-sm font-bold text-[#00509d]">{total > 0 ? total.toFixed(2) : '—'}</div>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-blue-400 font-normal uppercase italic">sq ft</span>
                            </div>
                            {(bf > 0 || bnf > 0) && (
                              <p className="text-[9px] text-gray-400">
                                {bf} FAR + {bnf} Non-FAR = {total.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {FIELDS_B.map((f) => field(t, f))}
                        </div>
                        <div className="space-y-3 pt-4 border-t">
                          {uploadBox(t, 'plan')}
                          {uploadBox(t, 'keyPlan')}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {/* Calculations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[50vh]">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center flex-wrap gap-4">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-gray-800">Calculations (FAR, Area & Thickness)</h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">This table is autopopulated as LHS is updated</p>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6">
              <table className="w-full border-collapse">
                {headRow}
                <tbody>
                  {groupRow('FAR Utilization')}
                  {calcRows(FAR_ROWS)}
                  {groupRow('Area')}
                  {calcRows(AREA_ROWS)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Efficiencies */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[35vh]">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-gray-800">Unit Efficiencies</h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Calculated per Typology</p>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6">
              <table className="w-full border-collapse">
                {headRow}
                <tbody>
                  {groupRow('Unit Efficiencies')}
                  {EFF_ROWS.map((r, i) => {
                    const dev = types.some((t) => checkDeviation(r, String(efficiencies(t)[r]), benchmarks))
                    const req = formatBenchmark(getBenchmark(r, benchmarks))
                    return (
                      <tr key={i} className={`hover:bg-blue-50/30 transition-colors border-b ${dev ? 'bg-red-50/40' : ''}`}>
                        <td className="px-6 py-3 border-r sticky left-0 z-10 bg-white">
                          <span className={`font-semibold text-xs ${dev ? 'text-red-600' : 'text-gray-600'}`}>{r}</span>
                          {dev && <span className="ml-2 text-[10px] text-red-500 font-semibold">● Benchmark</span>}
                          {dev && req && (
                            <p className="text-[10px] mt-0.5 text-gray-400">
                              {reqLabel()} <span className="font-semibold text-blue-400">{req}</span>
                            </p>
                          )}
                        </td>
                        {types.map((t) => {
                          const v = efficiencies(t)[r]
                          const d = checkDeviation(r, String(v), benchmarks)
                          return (
                            <td key={t.id} className={`px-4 py-3 text-center font-bold text-xs border-r ${d ? 'text-red-600' : 'text-[#00509d]'}`}>
                              {v}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-8 flex justify-end gap-3 pb-10">
        <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-5 rounded-lg font-bold shadow-sm h-11">
          <X size={16} className="mr-2" /> Cancel
        </Button>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#00509d] hover:bg-[#003f7a] text-white px-8 py-5 rounded-lg font-bold shadow-md h-11 gap-2 border-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_CSS }} />
    </div>
  )
}
