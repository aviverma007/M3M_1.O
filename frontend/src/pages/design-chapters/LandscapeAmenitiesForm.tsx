import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox, Switch } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import SelectWithOther from '@/components/shared/SelectWithOther'
import { BackLink, SaveProjectFooter } from '@/components/design-chapters-b/PageChrome'
import SimpleDialog from '@/components/design-chapters-b/SimpleDialog'
import { DEFAULT_AMENITIES, DEFAULT_LANDSCAPE_CONFIG } from '@/components/design-chapters-b/landscapeCatalogue'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, useBenchmarks } from '@/lib/benchmark'
import type { AmenityHead, FieldValue, LandscapeCategory, LandscapeParam } from '@/types/chapters-b'

const addBtn = 'text-[11px] font-bold p-0 h-auto gap-1'

export default function LandscapeAmenitiesForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<LandscapeCategory[]>(DEFAULT_LANDSCAPE_CONFIG)
  const [amenities, setAmenities] = useState<AmenityHead[]>(DEFAULT_AMENITIES)
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [selected, setSelected] = useState<string[]>([])
  const benchmarks = useBenchmarks()

  // dialogs
  const [catOpen, setCatOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [paramOpen, setParamOpen] = useState(false)
  const [paramCat, setParamCat] = useState('')
  const [paramName, setParamName] = useState('')
  const [headOpen, setHeadOpen] = useState(false)
  const [newHead, setNewHead] = useState('')
  const [amenityOpen, setAmenityOpen] = useState(false)
  const [amenityHead, setAmenityHead] = useState('')
  const [amenityName, setAmenityName] = useState('')

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      const d = s?.landscapeAmenitiesData
      if (!d) return
      if (d.landscapeConfig) setConfig(d.landscapeConfig)
      if (d.amenitiesList) setAmenities(d.amenitiesList)
      if (d.landscapeData) setValues(d.landscapeData)
      if (d.selectedAmenities) setSelected(d.selectedAmenities)
    },
    { label: 'landscape & amenities data' },
  )

  const setValue = (name: string, v: FieldValue) => setValues((p) => ({ ...p, [name]: v }))
  const toggleAmenity = (a: string) => setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))

  const addCategory = () => {
    if (!newCat.trim()) return
    setConfig([...config, { category: newCat, parameters: [] }])
    setNewCat('')
    setCatOpen(false)
  }
  const addParameter = () => {
    if (!paramCat || !paramName.trim()) return
    setConfig((c) =>
      c.map((x) =>
        x.category === paramCat
          ? { ...x, parameters: [...x.parameters, { name: paramName.replace(/\s+/g, '_').toLowerCase(), label: paramName, type: 'input', unit: 'Text' }] }
          : x,
      ),
    )
    setParamName('')
    setParamOpen(false)
  }
  const addHead = () => {
    if (!newHead.trim()) return
    setAmenities([...amenities, { head: newHead, items: [] }])
    setNewHead('')
    setHeadOpen(false)
  }
  const addAmenity = () => {
    if (!amenityHead || !amenityName.trim()) return
    setAmenities((a) => a.map((x) => (x.head === amenityHead ? { ...x, items: [...x.items, amenityName] } : x)))
    setAmenityName('')
    setAmenityOpen(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, {
        landscapeAmenitiesData: { landscapeConfig: config, amenitiesList: amenities, landscapeData: values, selectedAmenities: selected },
      })
      toast.success('Landscape & Amenities saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving landscape & amenities:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const amenityItem = (t: string) => (
    <div key={t} className="flex items-start gap-3">
      <Checkbox
        id={t}
        checked={selected.includes(t)}
        onCheckedChange={() => toggleAmenity(t)}
        className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#4caf50] data-[state=checked]:border-[#4caf50]"
      />
      <label htmlFor={t} className="text-[11px] font-medium text-gray-500 leading-tight cursor-pointer hover:text-gray-900 transition-colors">
        {t}
      </label>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1600px] mx-auto mb-6">
        <BackLink label="Landscape & Amenities" />
        <h1 className="text-2xl font-bold text-gray-900">Landscape & Amenities</h1>
        <p className="text-sm text-gray-500 mt-1">Configure landscape planning and select amenities</p>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pb-20">
        {/* parameter table */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00509d] text-white">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-[30%]">Category</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-[40%]">Parameter</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-[30%]">This Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {config.map((cat) => (
                  <Fragment key={cat.category}>
                    {cat.parameters.length === 0 && (
                      <tr className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-4 text-[11px] font-bold text-gray-600 align-top border-r bg-gray-50/30">{cat.category}</td>
                        <td className="px-4 py-4 text-[11px] font-medium text-gray-500 italic">No parameters yet</td>
                        <td className="px-4 py-4" />
                      </tr>
                    )}
                    {cat.parameters.map((p, i) => {
                      const raw = values[p.name]
                      const cmp = p.type === 'switch' ? (raw === true ? 'Yes' : raw === false ? 'No' : raw) : raw
                      const dev = checkDeviation(p.label, cmp, benchmarks)
                      const req = formatBenchmark(getBenchmark(p.label, benchmarks))
                      return (
                        <tr key={p.name} className={`hover:bg-gray-50 transition-colors group ${dev ? 'bg-red-50/40' : ''}`}>
                          {i === 0 && (
                            <td className="px-4 py-4 text-[11px] font-bold text-gray-600 align-top border-r bg-gray-50/30" rowSpan={cat.parameters.length}>
                              {cat.category}
                            </td>
                          )}
                          <td className="px-4 py-4 leading-tight">
                            <span className={`text-[11px] font-medium ${dev ? 'text-red-600' : 'text-gray-500'}`}>{p.label}</span>
                            {dev && <span className="ml-2 text-[10px] text-red-500 font-semibold">● Benchmark</span>}
                          </td>
                          <td className="px-4 py-4">
                            <LandscapeInput param={p} value={raw} deviates={dev} onChange={(v) => setValue(p.name, v)} />
                            {req && (
                              <p className="text-[10px] mt-1 text-gray-400">
                                {reqLabel()} <span className="font-semibold text-blue-400">{req}</span>
                              </p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-gray-50 flex gap-3">
              <Button variant="ghost" onClick={() => setCatOpen(true)} className={`${addBtn} text-[#4caf50] hover:text-green-700 hover:bg-green-50`}>
                <Plus size={14} className="border border-current rounded-full" /> Add Category
              </Button>
              <Button variant="ghost" onClick={() => setParamOpen(true)} className={`${addBtn} text-[#4caf50] hover:text-green-700 hover:bg-green-50`}>
                <Plus size={14} className="border border-current rounded-full" /> Add Parameter
              </Button>
            </div>
          </div>
        </div>

        {/* amenities */}
        <div className="xl:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#00509d] text-white px-6 py-3">
              <h2 className="text-[14px] font-bold">Amenities</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {amenities.map((a) => {
                const half = Math.ceil(a.items.length / 2)
                return (
                  <div key={a.head} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 group hover:bg-gray-50/50 transition-colors">
                    <div className="md:col-span-3">
                      <h3 className="text-[12px] font-black text-gray-700 leading-tight border-l-4 border-[#00509d] pl-3">{a.head}</h3>
                    </div>
                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex flex-col gap-4">{a.items.slice(0, half).map(amenityItem)}</div>
                      <div className="flex flex-col gap-4">{a.items.slice(half).map(amenityItem)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
              {(
                [
                  ['Add head', () => setHeadOpen(true)],
                  ['Add amenity', () => setAmenityOpen(true)],
                ] as const
              ).map(([label, onClick]) => (
                <Button key={label} variant="ghost" onClick={onClick} className={`${addBtn} text-[#00509d] hover:text-blue-700 hover:bg-blue-50`}>
                  <div className="w-4 h-4 rounded-full bg-[#00509d] text-white flex items-center justify-center">
                    <Plus size={12} />
                  </div>
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {catOpen && (
        <SimpleDialog title="Add Category" onCancel={() => setCatOpen(false)} onAdd={addCategory}>
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Special Features" className="mb-4" />
        </SimpleDialog>
      )}
      {paramOpen && (
        <SimpleDialog title="Add Parameter" onCancel={() => setParamOpen(false)} onAdd={addParameter}>
          <Select onValueChange={setParamCat}>
            <SelectTrigger className="mb-3">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {config.map((c) => (
                <SelectItem key={c.category} value={c.category}>
                  {c.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={paramName} onChange={(e) => setParamName(e.target.value)} placeholder="Parameter Name" className="mb-4" />
        </SimpleDialog>
      )}
      {headOpen && (
        <SimpleDialog title="Add Head" onCancel={() => setHeadOpen(false)} onAdd={addHead}>
          <Input value={newHead} onChange={(e) => setNewHead(e.target.value)} placeholder="e.g. VIP Facilities" className="mb-4" />
        </SimpleDialog>
      )}
      {amenityOpen && (
        <SimpleDialog title="Add Amenity" onCancel={() => setAmenityOpen(false)} onAdd={addAmenity}>
          <Select onValueChange={setAmenityHead}>
            <SelectTrigger className="mb-3">
              <SelectValue placeholder="Select Head" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {amenities.map((a) => (
                <SelectItem key={a.head} value={a.head}>
                  {a.head}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={amenityName} onChange={(e) => setAmenityName(e.target.value)} placeholder="Amenity Name" className="mb-4" />
        </SimpleDialog>
      )}

      <SaveProjectFooter saving={saving} onSave={save} />
    </div>
  )
}

function LandscapeInput({ param: p, value, deviates, onChange }: { param: LandscapeParam; value: FieldValue; deviates: boolean; onChange: (v: FieldValue) => void }) {
  const devCls = deviates ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
  if (p.type === 'switch')
    return (
      <div className="flex items-center gap-3">
        <Switch checked={!!value} onCheckedChange={onChange} className="data-[state=checked]:bg-[#00509d]" />
        <span className="text-[10px] font-bold text-gray-400 w-6">{value ? 'Yes' : 'No'}</span>
      </div>
    )
  if (p.type === 'select')
    return (
      <SelectWithOther
        options={p.options ?? []}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        triggerClassName={`h-8 data-[size=default]:h-8 text-[11px] bg-white rounded-lg w-full ${devCls}`}
        inputClassName={`h-8 text-[11px] bg-white rounded-lg flex-1 ${devCls}`}
      />
    )
  return (
    <div className="relative">
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 text-[11px] bg-white rounded-lg pr-12 ${devCls}`}
        placeholder="Value"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold italic">{p.unit}</span>
    </div>
  )
}
