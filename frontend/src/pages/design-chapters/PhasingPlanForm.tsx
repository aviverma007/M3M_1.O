import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Info, Layers, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageLoader from '@/components/common/PageLoader'
import { ListPageHeader, SubmitFooter, greenAddBtn, thCls } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, uploadFile, useSummaryLoader } from '@/api/chapters-b'
import type { Phase } from '@/types/chapters-b'

const num = (v: unknown): number => (v ? parseFloat(String(v).replace(/,/g, '')) : 0) || 0
const SQFT_PER_ACRE = 43560

const FIELDS: { key: keyof Phase; label: string }[] = [
  { key: 'siteArea', label: 'Site area (sqft)' },
  { key: 'noOfTowers', label: 'No. of towers' },
  { key: 'noOfUnits', label: 'No. of units' },
  { key: 'farPermissible', label: 'FAR (Permissable)' },
  { key: 'farUtilized', label: 'FAR (Utilised)' },
  { key: 'saPerUnit', label: 'SA/unit' },
  { key: 'farPerUnit', label: 'FAR/unit' },
]

const td = 'px-6 py-4 text-[12px] font-medium text-gray-600 text-right'
const totTd = 'px-6 py-5 text-[12px] text-gray-900 text-right'

function SectionCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-5 border-b bg-gray-50/30">
        <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export default function PhasingPlanForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [phases, setPhases] = useState<Phase[]>([])

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      if (s?.phasingPlanData && s.phasingPlanData.length > 0) setPhases(s.phasingPlanData)
    },
    { delay: 500, label: 'phasing plan data' },
  )

  const addPhase = () =>
    setPhases([
      ...phases,
      { id: Date.now(), name: '', siteArea: '', noOfTowers: '', noOfUnits: '', farPermissible: '', farUtilized: '', saPerUnit: '', farPerUnit: '', mapImage: null },
    ])
  const update = (id: number, key: keyof Phase, value: string | null) => setPhases((p) => p.map((x) => (x.id === id ? { ...x, [key]: value } : x)))

  const uploadMap = async (phase: Phase, file: File | undefined) => {
    if (!file) return
    const tid = toast.loading(`Uploading map for ${phase.name || 'this phase'}...`)
    try {
      const url = await uploadFile(file)
      if (url) {
        update(phase.id, 'mapImage', url)
        toast.success('Map uploaded successfully!', { id: tid })
      } else toast.error('Failed to upload map to S3', { id: tid })
    } catch (e) {
      console.error('Error uploading map:', e)
      toast.error('Failed to upload map file', { id: tid })
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { phasingPlanData: phases })
      toast.success('Phasing Plan saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving phasing plan:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  const totals = phases.reduce(
    (t, s) => ({
      siteAreaSqft: t.siteAreaSqft + num(s.siteArea),
      farUtilized: t.farUtilized + num(s.farUtilized),
      noOfTowers: t.noOfTowers + num(s.noOfTowers),
      noOfUnits: t.noOfUnits + num(s.noOfUnits),
      saleableAreaSqft: t.saleableAreaSqft + num(s.saPerUnit) * num(s.noOfUnits),
    }),
    { siteAreaSqft: 0, farUtilized: 0, noOfTowers: 0, noOfUnits: 0, saleableAreaSqft: 0 },
  )

  if (loading) return <PageLoader />

  const empty = (cols: number) => (
    <tr>
      <td colSpan={cols} className="px-6 py-12 text-center text-gray-300 italic text-[12px]">
        No phase data available.
      </td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <ListPageHeader title="Phasing Plan" subtitle="Configure unit area parameters and view efficiency calculations" />
      <div className="max-w-[1600px] mx-auto flex gap-6 mb-24">
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[12px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} className="text-[#00509d]" />
                Phasing Strategy
              </h2>
              <Button onClick={addPhase} className={greenAddBtn}>
                <Plus size={16} /> Add Phase
              </Button>
            </div>
            {phases.length === 0 ? (
              <div className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                  <Layers size={24} />
                </div>
                <p className="text-[12px] font-bold text-gray-400">
                  No Phase Created yet.
                  <br />
                  Create phase first for plan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {phases.map((t) => (
                  <div key={t.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 relative group">
                    <button onClick={() => setPhases(phases.filter((x) => x.id !== t.id))} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                    <div className="mb-4 pr-8 border-b border-[#00509d]/20 pb-2">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => update(t.id, 'name', e.target.value)}
                        className="text-[14px] font-black text-[#00509d] bg-transparent border-none outline-none w-full placeholder:text-[#00509d]/40"
                        placeholder="Enter Phase Name (e.g. Phase 1A)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {FIELDS.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">{f.label}</label>
                          <Input
                            value={String(t[f.key] ?? '')}
                            onChange={(e) => update(t.id, f.key, e.target.value)}
                            className="h-10 text-[12px] bg-white border-gray-100 rounded-xl"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100/50">
                      <input
                        type="file"
                        id={`upload-map-${t.id}`}
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          uploadMap(t, e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                      <label
                        htmlFor={`upload-map-${t.id}`}
                        className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 hover:bg-white hover:border-[#00509d]/30 hover:text-[#00509d] transition-all cursor-pointer"
                      >
                        <Upload size={16} /> {t.mapImage ? String(t.mapImage).split('/').pop() : 'Upload Phase Map'}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <SectionCard icon={<Layers size={16} className="text-[#00509d]" />} title="Phasing Strategy Summary">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00509d] text-white">
                  <th className={thCls}>Phase No.</th>
                  <th className={`${thCls} text-right`}>Site Area (ACRES)</th>
                  <th className={`${thCls} text-right`}>FAR to be utilized (SQFT)</th>
                  <th className={`${thCls} text-right`}>No. of Towers</th>
                  <th className={`${thCls} text-right`}>No. of Units</th>
                  <th className={`${thCls} text-right`}>Saleable area/unit (SQFT)</th>
                  <th className={`${thCls} text-right`}>Saleable area (SQFT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {phases.length === 0 ? (
                  empty(7)
                ) : (
                  <>
                    {phases.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-[12px] font-bold text-gray-700">{t.name || '-'}</td>
                        <td className={td}>{t.siteArea ? (num(t.siteArea) / SQFT_PER_ACRE).toFixed(2) : '-'}</td>
                        <td className={td}>{t.farUtilized || '-'}</td>
                        <td className={td}>{t.noOfTowers || '-'}</td>
                        <td className={td}>{t.noOfUnits || '-'}</td>
                        <td className={td}>{t.saPerUnit || '-'}</td>
                        <td className="px-6 py-4 text-[12px] font-bold text-gray-800 text-right">
                          {t.saPerUnit && t.noOfUnits ? (num(t.saPerUnit) * num(t.noOfUnits)).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/80 font-black">
                      <td className="px-6 py-5 text-[12px] text-[#00509d]">Total</td>
                      <td className={totTd}>{totals.siteAreaSqft ? (totals.siteAreaSqft / SQFT_PER_ACRE).toFixed(2) : '-'}</td>
                      <td className={totTd}>{totals.farUtilized || '-'}</td>
                      <td className={totTd}>{totals.noOfTowers || '-'}</td>
                      <td className={totTd}>{totals.noOfUnits || '-'}</td>
                      <td className={totTd}>-</td>
                      <td className="px-6 py-5 text-[12px] text-[#00509d] text-right font-black">
                        {totals.saleableAreaSqft ? totals.saleableAreaSqft.toLocaleString() : '-'}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard icon={<Info size={16} className="text-[#00509d]" />} title="Permissible FAR Phasing">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00509d] text-white">
                  <th className={thCls} />
                  <th className={`${thCls} text-right`}>FAR</th>
                  <th className={`${thCls} text-right`}>FAR (IN SQ. FT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {phases.length === 0 ? (
                  empty(3)
                ) : (
                  <>
                    {phases.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-[12px] font-bold text-gray-700">{t.name || '-'}</td>
                        <td className={td}>{t.farPermissible || '-'}</td>
                        <td className={td}>{t.siteArea && t.farPermissible ? (num(t.siteArea) * num(t.farPermissible)).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/80 font-black">
                      <td className="px-6 py-5 text-[12px] text-[#00509d]">Total</td>
                      <td className={totTd}>-</td>
                      <td className="px-6 py-5 text-[12px] text-[#00509d] text-right font-black">
                        {phases.reduce((t, s) => t + num(s.siteArea) * num(s.farPermissible), 0).toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </SectionCard>
        </div>
      </div>
      <SubmitFooter saving={saving} onSubmit={submit} />
    </div>
  )
}
