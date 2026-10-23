import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ScheduleEntry } from '@/types/chapters-b'
import { withField } from './scheduleUtils'

/** Inline "add" row for a master schedule (isOverall) or a sub-schedule. */
export default function ScheduleEntryRow({
  value,
  onChange,
  onAdd,
  placeholder,
  isOverall = false,
  minDate,
}: {
  value: ScheduleEntry
  onChange: (v: ScheduleEntry) => void
  onAdd?: () => void
  placeholder: string
  isOverall?: boolean
  minDate?: string
}) {
  const set = (k: keyof ScheduleEntry, v: string) => onChange(withField(value, k, v))
  const cls = cn('h-10 text-[12px] bg-white rounded-xl', isOverall ? 'font-bold border-blue-200' : 'border-gray-100')
  return (
    <tr className={cn('border-b border-gray-100', isOverall ? 'bg-[#eef4fb] border-l-4 border-l-[#00509d]' : 'bg-gray-50/40')}>
      <td className={cn('px-4 py-3', !isOverall && 'pl-10')}>
        <Input value={value.task} onChange={(e) => set('task', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAdd?.()} className={cls} placeholder={placeholder} />
      </td>
      <td className="px-4 py-3">
        <Input value={value.duration} onChange={(e) => set('duration', e.target.value)} className={cls} placeholder="Days" />
      </td>
      <td className="px-4 py-3">
        <Input type="date" value={value.start} min={minDate} onChange={(e) => set('start', e.target.value)} className={cls} />
      </td>
      <td className="px-4 py-3">
        <Input type="date" value={value.finish} min={minDate} onChange={(e) => set('finish', e.target.value)} className={cls} />
      </td>
      <td className="px-4 py-3 text-center">
        {onAdd ? (
          <button onClick={onAdd} className="text-[#00509d] hover:bg-[#00509d]/10 p-2 rounded-lg transition-all" title={isOverall ? 'Add master schedule' : 'Add sub-schedule'}>
            <Plus size={20} />
          </button>
        ) : null}
      </td>
    </tr>
  )
}
