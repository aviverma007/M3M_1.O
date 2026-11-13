/* Comparison: drop-down card under each project with its key ratios — Module 6 key ratio panel and Module 1 Key Ratio. */
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KrCell, ProjectKeyRatios } from '@/api/comparison'

type Tab = 'm6' | 'm1'

export default function KeyRatioCard({ data, color, open, onToggle }: { data: ProjectKeyRatios | undefined; color: string; open: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<Tab>('m6')
  const m6 = data?.module6 ?? []
  const m1 = data?.module1 ?? []
  const n6 = m6.reduce((a, g) => a + g.rows.length, 0)
  const bad = [...m6.flatMap((g) => g.rows), ...m1].filter((r) => r.ok === false).length
  // Module 1 rows grouped by "Tab · Section"
  const m1Groups: { name: string; rows: KrCell[] }[] = []
  for (const r of m1) {
    let g = m1Groups.find((x) => x.name === r.group)
    if (!g) m1Groups.push((g = { name: r.group, rows: [] }))
    g.rows.push(r)
  }
  const groups = tab === 'm6' ? m6 : m1Groups

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ borderTop: `3px solid ${color}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors" aria-expanded={open}>
        <span className="text-[11px] font-black uppercase tracking-wider text-[#1A3566] flex-1">Key Ratios</span>
        {data ? (
          <span className="text-[10px] font-semibold text-gray-400">
            {n6 + m1.length} values{bad ? <span className="text-red-600"> · {bad} outside</span> : null}
          </span>
        ) : (
          <span className="text-[10px] text-gray-300">loading…</span>
        )}
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-gray-100 cmp-rise">
          <div className="flex gap-1 px-3 pt-2">
            {(
              [
                ['m6', `Module 6 (${n6})`],
                ['m1', `Module 1 Key Ratio (${m1.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold', tab === k ? 'bg-[#00509d] text-white' : 'text-gray-500 hover:bg-slate-100')}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[420px] overflow-y-auto px-3 pb-3 pt-1">
            {!groups.length && <p className="text-[11px] text-gray-400 p-3">{tab === 'm6' ? 'Module 6 key ratios not entered yet.' : 'Module 1 Key Ratio not entered yet.'}</p>}
            {groups.map((g) => (
              <div key={g.name} className="mt-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 px-1 pb-1">{g.name}</p>
                <div className="divide-y divide-gray-50">
                  {g.rows.map((r, i) => (
                    <div key={`${r.label}-${i}`} className={cn('flex items-start gap-2 px-1 py-1.5 rounded', r.ok === false && 'bg-red-50/60')}>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[11px] font-semibold leading-snug', r.ok === false ? 'text-red-700' : 'text-gray-700')}>{r.label}</p>
                        {r.req && <p className="text-[9.5px] text-gray-400">Req: {r.req}</p>}
                      </div>
                      <span className={cn('text-[12px] font-black whitespace-nowrap', r.ok === false ? 'text-red-600' : r.ok === true ? 'text-green-700' : 'text-[#1A3566]')}>
                        {r.value}
                        {r.unit && <span className="text-[9px] font-semibold text-gray-400 ml-1">{r.unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
