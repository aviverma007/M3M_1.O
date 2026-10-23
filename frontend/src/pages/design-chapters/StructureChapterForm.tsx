/* Structure chapter: /dashboard/project/:projectId/design-chapters/structure (original StructureChapterForm). */
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/overlays'
import PageLoader from '@/components/common/PageLoader'
import SelectWithOther from '@/components/shared/SelectWithOther'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, useBenchmarks } from '@/lib/benchmark'
import { errorMessage, getStructure, saveStructure } from '@/api/chapters-a'
import type { DynamicInput } from '@/types/chapters-a'

type Field = { name: string; label: string; type: 'select' | 'text'; options?: string[]; unit?: string }

const FORMWORK: Field[] = [
  { name: 'towerAreaNonTypical', label: 'Tower Area - Non Typ. Floors', type: 'select', options: ['Conventional', 'Monolithic Aluminium', 'Tunnel Form', 'Mivan', 'Precast', 'Hybrid', 'Others'] },
  { name: 'towerAreaTypical', label: 'Tower Area - Typical Floors', type: 'select', options: ['Monolithic Aluminium', 'Conventional', 'Tunnel Form', 'Mivan', 'Precast', 'Hybrid', 'Others'] },
  { name: 'nfa', label: 'NTA Formwork Type', type: 'select', options: ['Conventional', 'Monolithic Aluminium', 'Tunnel Form', 'Precast'] },
  { name: 'commercial', label: 'Commercial Formwork Type', type: 'select', options: ['Conventional', 'Monolithic Aluminium', 'Precast'] },
]
const SYSTEM: Field[] = [
  { name: 'earthquakeResistance', label: 'Earthquake Resistance', type: 'select', options: ['Seismic Zone II', 'Seismic Zone III', 'Seismic Zone IV', 'Seismic Zone V'] },
  { name: 'structuralSystem', label: 'Structural System', type: 'select', options: ['Shear Wall System', 'Frame Structure', 'Flat Slab', 'Tube System', 'Hybrid'] },
  { name: 'typeOfStructure', label: 'Type Of Structure', type: 'select', options: ['Type 1', 'Type 2', 'Type 3'] },
  { name: 'typeOfConstruction', label: 'Type Of Construction', type: 'select', options: ['Aluminium Formwork', 'Conventional', 'Mivan', 'Precast', 'Hybrid'] },
  { name: 'expansionJoints', label: 'Non-Tower Area Expansion Joints', type: 'select', options: ['Yes – With Justification', 'No (Benchmark)'] },
  { name: 'designExecution', label: 'Design Execution', type: 'select', options: ['BIM + Tekla', 'BIM Only', 'CAD Only', 'Manual'] },
]
const MATERIAL: Field[] = [
  { name: 'maxGradeOfConcrete', label: 'Max. Grade of Concrete', type: 'select', options: ['M25', 'M30', 'M35', 'M40', 'M45', 'M50', 'M55', 'M60'] },
  { name: 'builtUpArea', label: 'Built Up Area', type: 'text', unit: 'Sq. ft' },
  { name: 'steelConsumptionCoefficient', label: 'Steel Consumption Coefficient', type: 'text', unit: 'per' },
  { name: 'totalSteelConsumption', label: 'Total Steel Consumption', type: 'text', unit: 'Kg' },
  { name: 'concreteConsumptionCoefficient', label: 'Concrete Consumption Coefficient', type: 'text', unit: '' },
  { name: 'totalConcreteConsumption', label: 'Total Concrete Consumption', type: 'text', unit: 'Cubic m' },
]
const ALL = [...FORMWORK, ...SYSTEM, ...MATERIAL]

type Values = Record<string, string>

function GroupHeader({ title, top = false }: { title: string; top?: boolean }) {
  return (
    <div className={`bg-[#e8f5e9] px-6 py-2 border-b border-gray-100 ${top ? 'border-t ' : ''}flex items-center`}>
      <h2 className="text-[10px] font-bold text-[#2e7d32] uppercase tracking-[2px]">{title}</h2>
    </div>
  )
}

export default function StructureChapterForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recordId, setRecordId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [dynamic, setDynamic] = useState<DynamicInput[]>([])
  const benchmarks = useBenchmarks()
  const [draft, setDraft] = useState({ group: '', name: '', benchmark: '' })
  const { control, handleSubmit, setValue, watch } = useForm<Values>()

  const bua = watch('builtUpArea') || 0
  const steel = watch('steelConsumptionCoefficient') || 0
  const concrete = watch('concreteConsumptionCoefficient') || 0
  useEffect(() => {
    if (bua && steel) setValue('totalSteelConsumption', (parseFloat(String(bua)) * parseFloat(String(steel))).toFixed(2))
  }, [bua, steel, setValue])
  useEffect(() => {
    if (bua && concrete) setValue('totalConcreteConsumption', (parseFloat(String(bua)) * parseFloat(String(concrete))).toFixed(2))
  }, [bua, concrete, setValue])

  useEffect(() => {
    ;(async () => {
      try {
        const rows = await getStructure(projectId!)
        if (rows.length > 0) {
          const rec = rows[0]
          setRecordId(rec.id)
          const cf = rec.customFields
          if (cf) {
            ALL.forEach((f) => cf[f.name] && setValue(f.name, String(cf[f.name])))
            const dyn = cf.dynamicInputs || []
            setDynamic(dyn)
            dyn.forEach((d) => setValue(`dynamic_${d.name}`, d.value || ''))
          }
        }
      } catch (e) {
        console.error('Error fetching Structure data:', e)
        toast.error('Failed to fetch data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId, setValue])

  const onSubmit = async (values: Values) => {
    setSaving(true)
    try {
      const v = values || watch()
      const customFields: Record<string, unknown> = {}
      ALL.forEach((f) => (customFields[f.name] = v[f.name]))
      customFields.dynamicInputs = dynamic.map((d) => ({ ...d, value: v[`dynamic_${d.name}`] }))
      await saveStructure(recordId, { projectId: parseInt(projectId!), customFields, status: 'Submitted' })
      toast.success('Structure details saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving Structure:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  const addField = () => {
    if (!draft.group || !draft.name) {
      toast.error('Please fill in Group and Name')
      return
    }
    setDynamic([...dynamic, { ...draft, id: Date.now(), value: '' }])
    setAddOpen(false)
    setDraft({ group: '', name: '', benchmark: '' })
    toast.success('Custom input added!')
  }

  if (loading) return <PageLoader />

  const row = (f: Field, isDynamic = false, dynId: number | null = null) => {
    const name = isDynamic ? `dynamic_${f.name}` : f.name
    const value = watch(name)
    const dev = !isDynamic && checkDeviation(f.label, value, benchmarks)
    const req = isDynamic ? null : formatBenchmark(getBenchmark(f.label, benchmarks))
    return (
      <div
        key={name}
        className={`flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 group hover:bg-gray-50/50 px-6 transition-colors ${dev ? 'bg-red-50/40' : ''}`}
      >
        <div className="w-1/2 flex items-center gap-2 mb-2 sm:mb-0">
          <label className={`text-xs font-bold ${dev ? 'text-red-600' : 'text-gray-800'}`}>{f.label}</label>
          {dev && <span className="text-[10px] text-red-500 font-semibold">● Benchmark</span>}
          {isDynamic && (
            <button
              type="button"
              onClick={() => setDynamic(dynamic.filter((d) => d.id !== dynId))}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div className="w-1/2 relative">
          <Controller
            name={name}
            control={control}
            render={({ field }) =>
              f.type === 'select' ? (
                <SelectWithOther options={f.options || []} value={field.value || ''} onChange={field.onChange} triggerClassName={dev ? 'border-red-400 ring-1 ring-red-300' : ''} />
              ) : (
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="Value"
                  className={`h-9 text-sm bg-white rounded-lg pr-12 w-full ${dev ? 'border-red-400 ring-1 ring-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                />
              )
            }
          />
          {f.unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic pointer-events-none">{f.unit}</span>
          )}
          {req && (
            <p className="text-[10px] mt-1 text-gray-400">
              {reqLabel()} <span className="font-semibold text-blue-400">{req}</span>
            </p>
          )}
        </div>
      </div>
    )
  }
  const dynRows = (group: string) => dynamic.filter((d) => d.group === group).map((d) => row({ name: d.name, label: d.name, type: 'text' }, true, d.id))

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1200px] mx-auto mb-6 flex justify-between items-end">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-[#00509d] hover:text-blue-800 font-bold transition-colors mb-4 group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Structure</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Structure</h1>
          <p className="text-sm text-gray-500 mt-1">Configure unit-level parameters and view efficiency calculations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-[1200px] mx-auto pb-12">
        <h2 className="text-[14px] font-bold text-gray-800 mb-3">Additional Project Details</h2>
        <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-[#00509d] flex px-6 py-2.5 text-white">
            <div className="w-1/2 text-[10px] font-bold uppercase tracking-[2px]">ELEMENT</div>
            <div className="w-1/2 text-[10px] font-bold uppercase tracking-[2px]">INPUT</div>
          </div>
          <GroupHeader title="PROPOSED FRAMEWORK" />
          <div className="divide-y divide-gray-100 bg-white">
            {FORMWORK.map((f) => row(f))}
            {/* original filters on "Proposed Framework" while the dialog offers "Proposed Formwork" */}
            {dynRows('Proposed Framework')}
          </div>
          <GroupHeader title="STRUCTURAL SYSTEM DETAILS" top />
          <div className="divide-y divide-gray-100 bg-white">
            {SYSTEM.map((f) => row(f))}
            {dynRows('Structural System Details')}
          </div>
          <GroupHeader title="MATERIAL & CONSUMPTION" top />
          <div className="divide-y divide-gray-100 bg-white">
            {MATERIAL.map((f) => row(f))}
            {dynRows('Material & Consumption')}
          </div>
          <div className="flex justify-center py-4 bg-white border-t border-gray-100">
            <Button type="button" onClick={() => setAddOpen(true)} className="bg-[#4caf50] hover:bg-[#43a047] text-white rounded-full px-6 py-1 h-8 text-[11px] font-bold shadow-sm">
              <Plus size={14} className="mr-1" /> Add Others
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-6 h-9">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#00509d] hover:bg-blue-800 text-white min-w-[100px] text-xs h-9">
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={14} className="mr-2" /> Submit
              </>
            )}
          </Button>
        </div>
      </form>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Group</label>
              <Select value={draft.group} onValueChange={(v) => setDraft({ ...draft, group: v })}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Proposed Formwork">Proposed Formwork</SelectItem>
                  <SelectItem value="Structural System Details">Structural System Details</SelectItem>
                  <SelectItem value="Material & Consumption">Material & Consumption</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Field Name</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Additional Specs" className="h-10 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addField} className="bg-[#00509d] hover:bg-blue-800 text-white">
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
