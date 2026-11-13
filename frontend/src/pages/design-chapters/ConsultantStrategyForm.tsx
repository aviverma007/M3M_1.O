import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import { DateCell, ListCard, ListPageHeader, SubmitFooter, greenAddBtn, thCls } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import { cn } from '@/lib/utils'
import type { ConsultantRow } from '@/types/chapters-b'
import { buaOf, consultantFees, rupees, rupeesShort } from '@/lib/fees'
import { fmtNum } from '@/lib/projectComparison'

const DEFAULT_CONSULTANTS = [
  'Architect',
  'MEP Consultant',
  'Structural Consultant',
  'Landscape Consultant',
  'Landscape Consultant (Local)',
  '3D Rendering Consultant',
  'Cost Consultant (Pre Contract)',
  'Cost Consultant (Post Contract)',
  'GRIHA Consultant',
  'Proof Consultant (Structural)',
  'IIT Structural Consultant',
  'TEKLA Consultant',
  'Interior Designer',
  'Scale Model',
  'Traffic Consultant (Vertical)',
  'Traffic Consultant (Horizontal)',
  'BIM Consultant',
  'Signage Consultant',
  'Façade Consultant',
  'Lighting Consultant',
  'BOH Consultant',
]

const blank = (id: number, type = ''): ConsultantRow => ({ id, type, name: '', status: 'Not Appointed', plannedDate: '', actualDate: '', remarks: '' })
const cellInput = 'h-10 text-[12px] bg-white border-gray-100 focus:bg-white rounded-xl'

export default function ConsultantStrategyForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<ConsultantRow[]>([])
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      setSummary((s as Record<string, unknown>) ?? null)
      if (s?.consultantStrategyData && s.consultantStrategyData.length > 0) setRows(s.consultantStrategyData)
      else setRows(DEFAULT_CONSULTANTS.map((t, i) => blank(i, t)))
    },
    { delay: 500, label: 'consultant strategy data' },
  )

  const update = (id: number, key: keyof ConsultantRow, value: string) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: value } : x)))
  const fees = consultantFees(summary, rows)
  const bua = buaOf(summary)

  const submit = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { consultantStrategyData: rows })
      toast.success('Consultant Strategy saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving consultant strategy:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <ListPageHeader title="Consultant Strategy" subtitle="Manage consultant appointments and timelines" />
      <ListCard
        icon={<ListChecks size={18} />}
        title="Consultant List"
        action={
          <Button onClick={() => setRows([...rows, blank(Date.now())])} className={greenAddBtn}>
            <Plus size={16} /> Add Consultant
          </Button>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#00509d] text-white">
              <th className={`${thCls} w-[15%]`}>Types of Consultants Needed</th>
              <th className={`${thCls} w-[12%]`}>Name</th>
              <th className={`${thCls} w-[11%]`}>Status</th>
              <th className={`${thCls} w-[11%]`}>Planned Date</th>
              <th className={`${thCls} w-[11%]`}>Actual Date</th>
              <th className={`${thCls} w-[13%]`}>Order Value (Rs.)</th>
              <th className={`${thCls} w-[9%] text-right`}>Rs. / sq ft BUA</th>
              <th className={`${thCls} w-[14%]`}>Remarks</th>
              <th className={`${thCls} w-12 text-center`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Input value={t.type} onChange={(e) => update(t.id, 'type', e.target.value)} className={`${cellInput} font-medium`} placeholder="Enter Consultant Type" />
                </td>
                <td className="px-4 py-3">
                  <Input value={t.name} onChange={(e) => update(t.id, 'name', e.target.value)} className={cellInput} placeholder="Enter Name" />
                </td>
                <td className="px-4 py-3">
                  <Select value={t.status} onValueChange={(v) => update(t.id, 'status', v)}>
                    <SelectTrigger
                      className={cn(
                        'h-10 data-[size=default]:h-10 text-[11px] font-bold rounded-xl border-gray-100',
                        t.status === 'Appointed' ? 'text-green-600 bg-green-50/30' : 'text-amber-600 bg-amber-50/30',
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Appointed" className="text-[12px] font-bold text-green-600">
                        Appointed
                      </SelectItem>
                      <SelectItem value="Not Appointed" className="text-[12px] font-bold text-amber-600">
                        Not Appointed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <DateCell value={t.plannedDate} onChange={(v) => update(t.id, 'plannedDate', v)} className={`${cellInput} pl-3 pr-8`} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={t.actualDate} onChange={(v) => update(t.id, 'actualDate', v)} className={`${cellInput} pl-3 pr-8`} />
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const appointed = t.status === 'Appointed'
                    const v = parseFloat(String(t.fee ?? '').replace(/,/g, ''))
                    return (
                      <div title={appointed ? undefined : 'Mark the consultant Appointed to enter the order value'}>
                        <Input
                          value={t.fee ?? ''}
                          onChange={(e) => update(t.id, 'fee', e.target.value.replace(/[^0-9.,]/g, ''))}
                          disabled={!appointed}
                          inputMode="decimal"
                          className={cn(cellInput, 'text-right', !appointed && 'bg-gray-100 text-gray-400 cursor-not-allowed')}
                          placeholder={appointed ? 'e.g. 2500000' : 'Not appointed'}
                        />
                        {appointed && Number.isFinite(v) && v > 0 && <p className="text-[10px] text-gray-400 text-right mt-0.5">Rs. {rupeesShort(v)}</p>}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-right text-[12px] font-bold text-[#1A3566] whitespace-nowrap">
                  {(() => {
                    const line = fees.lines[rows.indexOf(t)]
                    return line?.perSqft !== null && line?.perSqft !== undefined ? fmtNum(line.perSqft, 2) : <span className="text-gray-300 font-normal">—</span>
                  })()}
                </td>
                <td className="px-4 py-3">
                  <Input value={t.remarks} onChange={(e) => update(t.id, 'remarks', e.target.value)} className={cellInput} placeholder="Enter Remarks" />
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setRows(rows.filter((x) => x.id !== t.id))} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#1A3566] text-white">
              <td colSpan={5} className="px-4 py-3 text-[12px] font-black uppercase tracking-wider">
                Total consultant fees ({fees.lines.filter((l) => l.fee !== null).length} appointed with value)
                <span className="block text-[10px] font-semibold normal-case tracking-normal text-[#A8C8E8]">
                  {bua ? `Built Up Area ${fmtNum(bua, 0)} sq ft (Module 6)` : 'Enter Built Up Area in Module 6 to see Rs. per sq ft'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-[13px] font-black whitespace-nowrap">Rs. {rupees(fees.total)}</td>
              <td className="px-4 py-3 text-right text-[13px] font-black whitespace-nowrap">{fees.perSqft !== null ? fmtNum(fees.perSqft, 2) : '—'}</td>
              <td colSpan={2} className="px-4 py-3 text-[11px] text-[#A8C8E8]">{fees.total !== null ? `= Rs. ${rupeesShort(fees.total)}` : ''}</td>
            </tr>
          </tfoot>
        </table>
      </ListCard>
      <SubmitFooter saving={saving} onSubmit={submit} />
    </div>
  )
}
