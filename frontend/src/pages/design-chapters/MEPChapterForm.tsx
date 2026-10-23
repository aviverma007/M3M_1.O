/* MEP chapter: /dashboard/project/:projectId/design-chapters/mep (original MEPChapterForm — Elevators & HVAC). */
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleCheck, Download, Send, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/overlays'
import PageLoader from '@/components/common/PageLoader'
import SelectWithOther from '@/components/shared/SelectWithOther'
import { useAuth } from '@/auth/AuthContext'
import { downloadBlob } from '@/lib/download'
import { checkDeviation, formatBenchmark, getBenchmark, reqLabel, useBenchmarks } from '@/lib/benchmark'
import { downloadMepInputs, errorMessage, getKeyRatioAvgWait, getMep, getMepAssignees, saveMep } from '@/api/chapters-a'
import type { User } from '@/types'
import type { MepRecord } from '@/types/chapters-a'

type Field = { name: string; label: string; type: 'text' | 'select' | 'dimensions'; unit?: string; options?: string[] }
type Group = { group: string; benchmarkPrefix: string | null; fields: Field[] }

const GROUPS: Group[] = [
  {
    group: 'Elevators (Passenger)',
    benchmarkPrefix: 'passenger elevators',
    fields: [
      { name: 'passengerLiftsNo', label: 'No. Of Lifts', type: 'text' },
      { name: 'passengerLiftsStops', label: 'No. Of Stops', type: 'text' },
      { name: 'passengerLiftsSpeed', label: 'Speed Of Lift', type: 'text', unit: 'm/sec' },
      { name: 'passengerAverageWait', label: 'Average Waiting Time', type: 'text', unit: 'sec' },
      { name: 'passengerLiftSize', label: 'Lift Size', type: 'dimensions' },
    ],
  },
  {
    group: 'Elevators (Service)',
    benchmarkPrefix: 'service elevators',
    fields: [
      { name: 'serviceLiftsNo', label: 'No. Of Lifts', type: 'text' },
      { name: 'serviceLiftsStops', label: 'No. Of Stops', type: 'text' },
      { name: 'serviceLiftsSpeed', label: 'Speed Of Lift', type: 'text', unit: 'm/sec' },
      { name: 'serviceAverageWait', label: 'Average Waiting Time', type: 'text', unit: 'sec' },
      { name: 'serviceLiftSize', label: 'Lift Size', type: 'dimensions' },
    ],
  },
  {
    group: 'HVAC',
    benchmarkPrefix: null,
    fields: [
      { name: 'acProvisionUnits', label: 'AC Provision In Units', type: 'select', options: ['VRV/VRF', 'Ductable', 'Split', 'Split + Ductable', 'VRV/VRF + Ductable'] },
      { name: 'acAreaApartment', label: 'Air-Conditioned Area For Apartment', type: 'text', unit: 'sqm' },
      { name: 'tonnageApartment', label: 'Tonnage Per Apartment', type: 'text' },
      { name: 'costPerTonneApartment', label: 'Cost Per Tonne Per Apartment', type: 'text', unit: 'INR' },
      { name: 'acAreaClub', label: 'Air-Conditioned Area For Club', type: 'text', unit: 'sqm' },
      { name: 'tonnageClub', label: 'Tonnage Of Club House', type: 'text' },
      { name: 'efficiencyApartment', label: 'Cooling Efficiency - Apartment', type: 'text', unit: 'sq ft/Tonne' },
      { name: 'efficiencyClub', label: 'Cooling Efficiency - Club', type: 'text', unit: 'sq ft/Tonne' },
    ],
  },
]

/** flat list of stored fields (dimensions split into Length / Width) */
const FLAT: Field[] = GROUPS.flatMap((g) =>
  g.fields.flatMap((f) => (f.type === 'dimensions' ? [{ ...f, name: `${f.name}Length`, type: 'text' as const }, { ...f, name: `${f.name}Width`, type: 'text' as const }] : [f])),
)

type Values = Record<string, unknown> & { customFields?: Record<string, string | null> }

const INFO = (
  <div className="w-4 h-4 rounded-full border border-blue-400 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] italic font-serif">i</div>
)

export default function MEPChapterForm() {
  const { projectId } = useParams()
  const [search] = useSearchParams()
  const reviewMode = search.get('mode') === 'review'
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const isSuperAdmin = ['super_admin', 'superadmin', 'admin', 'super admin'].includes(role ?? '')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recordId, setRecordId] = useState<number | null>(null)
  const [record, setRecord] = useState<MepRecord | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigneeName, setAssigneeName] = useState<string | null>(null)
  const [assign, setAssign] = useState({ memberId: '', instructions: '', dueDate: '' })
  const [members, setMembers] = useState<User[]>([])
  const [submittedOpen, setSubmittedOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customKeys, setCustomKeys] = useState<string[]>([])
  const benchmarks = useBenchmarks()

  const isContributor = role === 'general_contributor' || (['general_admin', 'general admin'].includes(role ?? '') && record?.assignedTo === user?.id)

  useEffect(() => {
    if (isSuperAdmin) return
    getMepAssignees()
      .then(setMembers)
      .catch((e) => console.error('Error fetching team members:', e))
  }, [isSuperAdmin])

  const { control, handleSubmit, setValue, watch } = useForm<Values>({
    defaultValues: FLAT.reduce((acc, f) => ({ ...acc, [f.name]: '', [`${f.name}Note`]: null }), {}),
  })

  /* average waiting time prefilled from Key Ratio */
  useEffect(() => {
    if (!projectId) return
    getKeyRatioAvgWait(projectId)
      .then((w) => {
        if (w) {
          setValue('passengerAverageWait', w)
          setValue('serviceAverageWait', w)
        }
      })
      .catch((e) => console.error('Error fetching Key Ratio data for MEP:', e))
  }, [projectId, setValue])

  /* average waiting time = stops * 7 / (speed * lifts) */
  const autoWait = (no: unknown, stops: unknown, speed: unknown, target: string) => {
    if (no && stops && speed) {
      const n = parseFloat(String(no)) || 0
      const st = parseFloat(String(stops)) || 0
      const sp = parseFloat(String(speed)) || 0
      if (n > 0 && sp > 0) setValue(target, ((st * 7) / (sp * n)).toFixed(2))
    }
  }
  const [pNo, pStops, pSpeed, sNo, sStops, sSpeed] = [
    watch('passengerLiftsNo'),
    watch('passengerLiftsStops'),
    watch('passengerLiftsSpeed'),
    watch('serviceLiftsNo'),
    watch('serviceLiftsStops'),
    watch('serviceLiftsSpeed'),
  ]
  useEffect(() => autoWait(pNo, pStops, pSpeed, 'passengerAverageWait'), [pNo, pStops, pSpeed]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoWait(sNo, sStops, sSpeed, 'serviceAverageWait'), [sNo, sStops, sSpeed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async () => {
      try {
        const rows = await getMep(projectId!)
        if (rows.length > 0) {
          const r = rows[0]
          setRecordId(r.id)
          setRecord(r)
          FLAT.forEach((f) => {
            setValue(f.name, r[f.name] || '')
            setValue(`${f.name}Note`, r[`${f.name}Note`] || null)
          })
          if (r.assignedTo) setAssign((a) => ({ ...a, memberId: String(r.assignedTo), dueDate: r.deadline ? r.deadline.split('T')[0] : '' }))
          if (r.Assignee?.name) setAssigneeName(r.Assignee.name)
          if (r.customFields) {
            setCustomKeys(Object.keys(r.customFields).filter((k) => !k.endsWith('Note')))
            Object.keys(r.customFields).forEach((k) => setValue(`customFields.${k}`, r.customFields![k] || ''))
          }
        }
      } catch (e) {
        console.error('Error fetching MEP data:', e)
        toast.error('Failed to fetch data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId, setValue])

  useEffect(() => {
    if (assign.memberId && members.length > 0) {
      const m = members.find((x) => String(x.id) === assign.memberId)
      if (m) setAssigneeName(m.name)
    }
  }, [assign.memberId, members])

  const save = async (values: Values | null = null, submit = false, approve = false, reject = false) => {
    setSaving(true)
    try {
      const v = values || watch()
      let status: string | undefined = recordId ? undefined : 'In Progress'
      if (submit) status = 'Submitted'
      if (approve) status = 'Approved'
      if (reject) status = 'Rejected'
      const cfIn = (v.customFields || {}) as Record<string, string | null>
      const customFields: Record<string, string | null> = {}
      customKeys.forEach((k) => {
        if (cfIn[k] !== undefined) customFields[k] = cfIn[k]
        if (cfIn[`${k}Note`] !== undefined) customFields[`${k}Note`] = cfIn[`${k}Note`]
      })
      const body = {
        ...v,
        projectId: parseInt(projectId!),
        assignedTo: assign.memberId ? parseInt(assign.memberId) : null,
        deadline: assign.dueDate ? new Date(assign.dueDate).toISOString() : null,
        status,
        receivedDate: submit ? new Date().toISOString() : undefined,
        customFields,
      }
      if (recordId) await saveMep(recordId, body)
      else {
        const r = await saveMep(null, body)
        if (r?.data?.id) setRecordId(r.data.id)
      }
      if (submit) toast.success('Task submitted successfully!')
      else if (approve) toast.success('Task approved successfully!')
      else if (reject) toast.success('Task rejected and sent back for revision.')
      else toast.success('Progress saved successfully!')
    } catch (e) {
      console.error('Error saving MEP:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  const addCustom = () => {
    const l = customLabel.trim()
    if (!l) return void toast.error('Please enter a field label')
    if (customKeys.includes(l)) return void toast.error('Field already exists')
    setCustomKeys([...customKeys, l])
    setValue(`customFields.${l}`, '')
    setCustomLabel('')
    setCustomOpen(false)
    toast.success(`Field "${customLabel}" added`)
  }

  const download = async () => {
    if (!recordId) return void toast.error('No record found to download.')
    try {
      const blob = await downloadMepInputs(recordId)
      downloadBlob(blob, `mep-design-brief-${recordId}.pdf`)
      toast.success('PDF Downloaded successfully!')
    } catch (e) {
      console.error('Error downloading PDF:', e)
      toast.error('Failed to download PDF.')
    }
  }

  const assignTask = async () => {
    if (!assign.memberId) return void toast.error('Please select a team member')
    await save()
    const m = members.find((x) => String(x.id) === assign.memberId)
    setAssigneeName(m ? m.name : 'Unknown')
    setAssignOpen(false)
    toast.success('Task assigned successfully')
  }

  if (loading) return <PageLoader />

  const downloadBtn = (
    <Button type="button" variant="outline" onClick={download} className="text-[#00509d] border-[#00509d] hover:bg-blue-50 gap-2 font-bold px-4">
      <Download className="w-4 h-4" />
      Download Inputs
    </Button>
  )
  const inputCls = (dev: boolean, extra = '') => `h-9 text-xs bg-white rounded-lg ${extra}${dev ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 focus:ring-blue-500'}`

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {isContributor ? (
          <div className="pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">MEP</h2>
              <p className="text-xs text-gray-400 mt-1 font-bold">Please provide the Inputs below</p>
            </div>
            {downloadBtn}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">MEP</h2>
                <p className="text-sm text-gray-500 mt-1">Elevators & HVAC</p>
              </div>
              {reviewMode && record?.Assignee && (
                <div className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm">Submitted By: {record.Assignee.name}</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isSuperAdmin && assigneeName && !reviewMode && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>
                    Assigned to: <strong>{assigneeName}</strong>
                  </span>
                  {['super_admin', 'design_admin'].includes(role ?? '') && (
                    <button className="text-blue-500 hover:text-blue-700 text-xs border border-blue-200 rounded px-2 py-0.5 bg-blue-50" onClick={() => setAssignOpen(true)}>
                      Change
                    </button>
                  )}
                </div>
              )}
              {downloadBtn}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit((v) => save(v, true))} className="max-w-[1200px] mx-auto pb-12 mt-6">
          <h2 className="text-[14px] font-bold text-gray-800 mb-3">Elevators and HVAC</h2>
          <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-[#00509d] flex px-6 py-2.5 text-white">
              <div className="w-1/2 flex pr-6">
                <div className="w-[45%] pr-4 text-[10px] font-bold uppercase tracking-[2px]">ELEMENT</div>
                <div className="w-[55%] text-[10px] font-bold uppercase tracking-[2px]">PER TOWER PARAMETER</div>
              </div>
              <div className="w-1/2 text-[10px] font-bold uppercase tracking-[2px]">INPUT</div>
            </div>
            {GROUPS.map((g, gi) => (
              <div key={g.group}>
                <div className={`bg-[#e8f5e9] px-6 py-2 border-b border-gray-100 flex items-center ${gi !== 0 ? 'border-t' : ''}`}>
                  <h2 className="text-[10px] font-bold text-[#2e7d32] uppercase tracking-[2px]">{g.group}</h2>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {g.fields.map((f, fi) => {
                    const value = watch(f.name)
                    const dev = checkDeviation(f.label, value, benchmarks, g.benchmarkPrefix ?? undefined)
                    const req = formatBenchmark(getBenchmark(f.label, benchmarks, g.benchmarkPrefix ?? undefined))
                    return (
                      <div key={f.name} className={`flex flex-col sm:flex-row py-3 group hover:bg-gray-50/50 transition-colors ${dev ? 'bg-red-50/40' : ''}`}>
                        <div className="w-1/2 flex px-6">
                          <div className="w-[45%] pr-4 flex items-center">
                            {fi === Math.floor(g.fields.length / 2) && <span className="text-xs font-bold text-gray-800">{g.group}</span>}
                          </div>
                          <div className="w-[55%] flex flex-col justify-center gap-0.5">
                            <div className="flex items-center gap-2">
                              <label className={`text-xs font-bold ${dev ? 'text-red-600' : 'text-gray-800'}`}>{f.label}</label>
                              {dev && <span className="text-[10px] text-red-500 font-semibold">● Benchmark</span>}
                            </div>
                            {req && (
                              <p className="text-[10px] text-gray-400">
                                {reqLabel()} <span className="font-semibold text-blue-400">{req}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="w-1/2 px-6 flex items-center">
                          {f.type === 'dimensions' ? (
                            <div className="flex items-center gap-3 w-full">
                              {(['Length', 'Width'] as const).map((part, pi) => (
                                <div key={part} className="contents">
                                  {pi === 1 && <span className="text-[10px] font-bold text-gray-400 uppercase">x</span>}
                                  <div className="relative w-full">
                                    <Controller
                                      name={`${f.name}${part}`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          value={String(field.value || '')}
                                          placeholder="Type"
                                          className="h-9 text-xs bg-white border-gray-200 focus:ring-blue-500 rounded-lg pr-6"
                                        />
                                      )}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">m</span>
                                  </div>
                                </div>
                              ))}
                              {INFO}
                            </div>
                          ) : f.type === 'select' ? (
                            <div className="flex items-center gap-3 w-full">
                              <Controller
                                name={f.name}
                                control={control}
                                render={({ field }) => (
                                  <SelectWithOther
                                    options={f.options || []}
                                    value={String(field.value || '')}
                                    onChange={field.onChange}
                                    fieldKey={f.name}
                                    triggerClassName={inputCls(dev, 'w-full ')}
                                    inputClassName={inputCls(dev, 'flex-1 ')}
                                  />
                                )}
                              />
                              {INFO}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 w-full">
                              <div className="relative w-full">
                                <Controller
                                  name={f.name}
                                  control={control}
                                  render={({ field }) => <Input {...field} value={String(field.value || '')} placeholder="Type" className={inputCls(dev)} />}
                                />
                                {f.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">{f.unit}</span>}
                              </div>
                              {INFO}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="outline" className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-6 h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#00509d] hover:bg-blue-800 text-white min-w-[100px] text-xs h-9">
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Send size={14} className="mr-2" /> Submit
                </>
              )}
            </Button>
          </div>
        </form>

        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Field Label <span className="text-red-500">*</span>
                </label>
                <Input placeholder="e.g. Additional Comments" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={addCustom}>
                Add Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={submittedOpen} onOpenChange={setSubmittedOpen}>
          <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-[28px] border-0 shadow-2xl">
            <div className="p-10 flex flex-col items-center text-center space-y-7">
              <div className="w-14 h-14 bg-[#14b8a6] rounded-full flex items-center justify-center shadow-lg shadow-teal-100">
                <CircleCheck className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Task Submitted Successfully</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-semibold px-4">
                  Your inputs have been sent to <span className="text-[#00509d] font-black">{record?.Creator?.name || 'Admin'}</span> for review. You will be notified once the review
                  is complete.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSubmittedOpen(false)
                  window.location.href = '/dashboard'
                }}
                className="w-full h-12 bg-[#00509d] hover:bg-[#003d73] text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all transform active:scale-[0.98]"
              >
                Back to My Tasks
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign to Team Member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Team Member <span className="text-red-500">*</span>
                </label>
                <Select value={assign.memberId} onValueChange={(v) => setAssign({ ...assign, memberId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                    {members.length === 0 && <div className="p-2 text-sm text-gray-500 text-center">No members found</div>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full min-h-[100px] border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add any specific instructions for this assignment..."
                  value={assign.instructions}
                  onChange={(e) => setAssign({ ...assign, instructions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Internal Due Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Input type="date" className="w-full text-sm placeholder:text-gray-400" value={assign.dueDate} onChange={(e) => setAssign({ ...assign, dueDate: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" className="bg-[#00509d] hover:bg-[#003f7a] text-white gap-2" onClick={assignTask}>
                <UserPlus className="w-4 h-4" />
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
