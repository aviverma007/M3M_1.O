import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import { SaveProjectFooter } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import { cn } from '@/lib/utils'
import type { FieldValue } from '@/types/chapters-b'
import { SERVICE_DESIGN, type ServiceParam as Param } from '@/components/design-chapters-b/serviceCatalogue'

const OTHER_RE = /^(other|others|any other|any others)$/

export default function ServiceDesignForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, FieldValue>>({})

  const loading = useSummaryLoader(projectId, (s) => s?.serviceDesignData && setValues(s.serviceDesignData), { label: 'service design data' })
  const set = (name: string, v: FieldValue) => setValues((p) => ({ ...p, [name]: v }))

  /** null = not filled, true = matches benchmark, false = deviates (strict string equality, as original) */
  const matches = (p: Param) => {
    const v = values[p.name]
    return v === undefined || v === '' ? null : String(v) === String(p.benchmark)
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { serviceDesignData: values })
      toast.success('Service Design Considerations saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving service design data:', e)
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Service Design Considerations</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Entry-Exit / Traffic Circulation / Service Entry</p>
        </div>
      </div>

      <div className="w-full mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-20">
        <div className="p-4 bg-white border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Landscape Configuration</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#00509d] text-white">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider w-[25%]">Category</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider w-[40%]">Parameter</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider w-[35%]">This Project</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SERVICE_DESIGN.map((cat) => (
              <Fragment key={cat.category}>
                {cat.parameters.map((p, i) => {
                  const m = matches(p)
                  return (
                    <tr key={p.name} className={`hover:bg-gray-50/50 transition-colors ${m === false ? 'bg-red-50/40' : ''}`}>
                      {i === 0 && (
                        <td className="px-6 py-6 text-[12px] font-bold text-gray-700 align-top border-r bg-gray-50/30" rowSpan={cat.parameters.length}>
                          {cat.category}
                        </td>
                      )}
                      <td className="px-6 py-6">
                        <span className={`text-[12px] font-medium ${m === false ? 'text-red-600' : 'text-gray-600'}`}>{p.label}</span>
                        {m === false && <span className="ml-2 text-[10px] text-red-500 font-semibold">● Benchmark</span>}
                        <p className="text-[10px] mt-1 text-gray-400">
                          Req: <span className="font-semibold text-blue-400">{String(p.benchmark)}</span>
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <ParamInput param={p} value={values[p.name]} match={m} onChange={(v) => set(p.name, v)} />
                          {m !== null && (
                            <p className={cn('text-[10px] font-bold italic', m ? 'text-green-500' : 'text-red-500')}>
                              {m ? 'Within Benchmark' : 'Selected value does not match benchmark'}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <SaveProjectFooter saving={saving} onSave={save} innerClassName="w-full px-6 flex justify-end gap-3" />
    </div>
  )
}

function ParamInput({ param: p, value, match: m, onChange }: { param: Param; value: FieldValue; match: boolean | null; onChange: (v: FieldValue) => void }) {
  if (p.type === 'switch')
    return (
      <div className="flex items-center gap-4">
        <Switch checked={!!value} onCheckedChange={onChange} className="data-[state=checked]:bg-[#00509d]" />
        <span className="text-[11px] font-bold text-gray-700 w-8">{value ? 'Yes' : 'No'}</span>
      </div>
    )
  const stateCls = m === true ? 'border-green-500 text-green-700' : m === false ? 'border-red-500 text-red-700' : 'border-gray-200'
  if (p.type === 'select') {
    const v = typeof value === 'string' ? value : ''
    const opts = p.options ?? []
    const other = opts.find((o) => OTHER_RE.test(o.toLowerCase().trim()))
    const isCustom = !!other && (v === other || (v !== '' && !opts.includes(v)))
    return (
      <div className="space-y-2 w-full">
        <Select value={isCustom ? other : v} onValueChange={onChange}>
          <SelectTrigger className={cn('h-10 data-[size=default]:h-10 text-[12px] bg-white border focus:ring-1 focus:ring-blue-500 rounded-lg w-full', stateCls)}>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {opts.map((o) => (
              <SelectItem key={o} value={o} className="text-[12px]">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isCustom && (
          <Input
            type="text"
            value={v === other ? '' : v}
            placeholder={`Specify custom ${p.label}`}
            onChange={(e) => onChange(e.target.value === '' ? other : e.target.value)}
            className="h-10 text-[12px] bg-white border focus:ring-1 focus:ring-blue-500 rounded-lg w-full mt-2"
          />
        )}
      </div>
    )
  }
  return (
    <div className="relative">
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 text-[12px] bg-white border focus:ring-1 rounded-lg pr-16',
          m === true ? 'border-green-500 text-green-700 focus:ring-green-500' : m === false ? 'border-red-500 text-red-700 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500',
        )}
        placeholder="Value"
      />
      {p.unit && (
        <span
          className={cn(
            'absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold italic',
            m === true ? 'text-green-500' : m === false ? 'text-red-500' : 'text-gray-400',
          )}
        >
          {p.unit}
        </span>
      )}
    </div>
  )
}
