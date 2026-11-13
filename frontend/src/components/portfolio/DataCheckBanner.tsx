/* Live data checks on an entry form: re-run on every change, shown above the form while something looks wrong. */
import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dataChecks } from '@/lib/dataChecks'
import type { CompareInput } from '@/lib/projectComparison'

export default function DataCheckBanner({ input, modules, className }: { input: CompareInput | null; modules: string[]; className?: string }) {
  const [open, setOpen] = useState(true)
  const issues = useMemo(() => (input ? dataChecks(input).filter((i) => modules.includes(i.module)) : []), [input, modules])
  if (!issues.length) return null
  const errors = issues.filter((i) => i.level === 'error').length
  return (
    <div className={cn('rounded-xl border px-4 py-3 cmp-rise', errors ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50', className)}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 text-left">
        <AlertTriangle size={16} className={errors ? 'text-red-600' : 'text-amber-600'} />
        <span className={cn('text-sm font-bold flex-1', errors ? 'text-red-700' : 'text-amber-800')}>
          {issues.length} figure{issues.length > 1 ? 's' : ''} to check before saving
          <span className="font-normal text-gray-500"> · these also lower the project&apos;s health score on the Portfolio page</span>
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 pl-6">
          {issues.map((i, n) => (
            <li key={n} className={cn('text-xs list-disc', i.level === 'error' ? 'text-red-700' : 'text-amber-800')}>
              {i.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
