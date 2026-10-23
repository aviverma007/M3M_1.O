import { Info, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ScheduleSection } from '@/types/chapters-b'
import { daysBetween } from './scheduleUtils'

const th = 'px-6 py-4 text-[10px] font-bold uppercase tracking-wider'


/** "Project Summary" table: sections with start/finish, computed days and months, structure months. */
export default function ScheduleSummary({ sections, onChange }: { sections: ScheduleSection[]; onChange: (s: ScheduleSection[]) => void }) {
  const patch = (id: number, p: Partial<ScheduleSection>) => onChange(sections.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const setDate = (id: number, key: 'start' | 'finish', value: string) =>
    onChange(
      sections.map((n) => {
        if (n.id !== id) return n
        const r = { ...n, [key]: value }
        if (r.start && r.finish) {
          const d = daysBetween(r.start, r.finish) || 0
          r.days = d
          r.durationMonths = (d / 30.4375).toFixed(1)
        }
        return r
      }),
    )
  const add = () => onChange([...sections, { id: Date.now(), name: '', start: '', finish: '', days: '', durationMonths: '', structureMonths: '' }])

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-5 border-b bg-gray-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00509d]/10 flex items-center justify-center text-[#00509d]">
            <Info size={18} />
          </div>
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Project Summary</h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#00509d] text-white">
              <th className={`${th} w-16`}>S.No</th>
              <th className={th}>Section</th>
              <th className={th}>Start Date (PCC)</th>
              <th className={th}>No. Of Days</th>
              <th className={th}>Finish Date</th>
              <th className={`${th} text-right`}>Project Duration (Months)</th>
              <th className={`${th} text-right`}>Structure Works (Months)</th>
              <th className="px-4 py-4 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections.map((t, i) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[12px] font-medium text-gray-400">{i + 1}</td>
                <td className="px-6 py-4">
                  <Input
                    value={t.name}
                    onChange={(e) => patch(t.id, { name: e.target.value })}
                    placeholder="Section name"
                    className="h-9 text-[12px] font-black text-[#00509d] bg-white border-gray-200 min-w-[120px]"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input type="date" value={t.start} onChange={(e) => setDate(t.id, 'start', e.target.value)} className="h-9 text-[12px] bg-white border-gray-200 min-w-[130px]" />
                </td>
                <td className="px-6 py-4 text-[12px] font-bold text-green-600">{t.days}</td>
                <td className="px-6 py-4">
                  <Input type="date" value={t.finish} onChange={(e) => setDate(t.id, 'finish', e.target.value)} className="h-9 text-[12px] bg-white border-gray-200 min-w-[130px]" />
                </td>
                <td className="px-6 py-4 text-[12px] font-black text-gray-800 text-right">{t.durationMonths}</td>
                <td className="px-6 py-4 text-right">
                  <Input
                    type="number"
                    value={t.structureMonths ?? ''}
                    onChange={(e) => patch(t.id, { structureMonths: e.target.value })}
                    placeholder="0.0"
                    className="h-9 text-[12px] font-black text-gray-800 bg-white border-gray-200 w-24 text-right ml-auto"
                  />
                </td>
                <td className="px-4 py-4 text-center">
                  <button onClick={() => onChange(sections.filter((s) => s.id !== t.id))} className="text-gray-300 hover:text-red-400 transition-colors" title="Remove section">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={8} className="px-6 py-3">
                <button onClick={add} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#00509d] hover:text-blue-800 transition-colors">
                  <Plus size={15} /> Add Section
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
