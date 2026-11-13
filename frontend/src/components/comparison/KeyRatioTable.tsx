/*
 * Comparison: Key Ratios as one table — parameter names on the left, one column per selected project.
 * Two tabs: Module 6 key ratio panel and Module 1 Key Ratio. Red = outside the Req: range, green = inside.
 */
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KrCell, ProjectKeyRatios } from '@/api/comparison'

type Head = { id: string; name: string }
type Row = { label: string; cells: (KrCell | null)[] }
type Group = { name: string; rows: Row[] }

/** always listed in the Efficiency group, even before anyone enters it */
const ALWAYS_AFTER: Record<string, string> = { 'Club Area / Unit': 'FAR Utilization' }

function merge(heads: Head[], pick: (d: ProjectKeyRatios | undefined) => { name: string; rows: KrCell[] }[], data: Record<string, ProjectKeyRatios>, always: Record<string, string> = {}): Group[] {
  const groups: Group[] = []
  heads.forEach((h, pi) => {
    for (const g of pick(data[h.id])) {
      let G = groups.find((x) => x.name === g.name)
      if (!G) groups.push((G = { name: g.name, rows: [] }))
      let last = -1
      for (const c of g.rows) {
        let i = G.rows.findIndex((r) => r.label === c.label)
        if (i < 0) {
          // keep each project's own order: insert after the previous row of this project
          i = last + 1
          G.rows.splice(i, 0, { label: c.label, cells: heads.map(() => null) })
        }
        G.rows[i].cells[pi] = c
        last = i
      }
    }
  })
  for (const [label, after] of Object.entries(always)) {
    const g = groups.find((x) => x.rows.some((r) => r.label === after))
    if (g && !g.rows.some((r) => r.label === label)) g.rows.splice(g.rows.findIndex((r) => r.label === after) + 1, 0, { label, cells: heads.map(() => null) })
  }
  return groups
}

const m1Groups = (d: ProjectKeyRatios | undefined) => {
  const out: { name: string; rows: KrCell[] }[] = []
  for (const r of d?.module1 ?? []) {
    let g = out.find((x) => x.name === r.group)
    if (!g) out.push((g = { name: r.group, rows: [] }))
    g.rows.push(r)
  }
  return out
}

export default function KeyRatioTable({ heads, colors, data }: { heads: Head[]; colors: string[]; data: Record<string, ProjectKeyRatios> }) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'m6' | 'm1'>('m6')
  const loaded = heads.every((h) => data[h.id])
  const g6 = merge(heads, (d) => d?.module6 ?? [], data, ALWAYS_AFTER)
  const g1 = merge(heads, m1Groups, data)
  const groups = tab === 'm6' ? g6 : g1
  const count = (gs: Group[]) => gs.reduce((a, g) => a + g.rows.length, 0)
  const outside = heads.map((_, pi) => [...g6, ...g1].flatMap((g) => g.rows).filter((r) => r.cells[pi]?.ok === false).length)
  const grid = `minmax(220px, 1.3fr) repeat(${heads.length}, minmax(0, 1fr))`

  return (
    <div id="cmp-keyratios" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-16">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full bg-[#00509d] text-white px-5 py-3 grid items-center gap-4 text-left"
        style={{ gridTemplateColumns: grid }}
      >
        <span className="text-sm font-black flex items-center gap-2">
          <ChevronDown size={16} className={cn('transition-transform', !open && '-rotate-90')} /> Key Ratios
        </span>
        {heads.map((h, i) => (
          <span key={h.id} className="text-[11px] font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i === 0 ? '#fff' : colors[i] }} />
            {h.name}
            {loaded && outside[i] > 0 && <span className="ml-1 normal-case tracking-normal font-semibold text-red-200">· {outside[i]} outside</span>}
          </span>
        ))}
      </button>
      {open && (
        <>
          <div className="flex gap-1 px-4 pt-3 pb-1">
            {(
              [
                ['m6', `Module 6 key ratios (${count(g6)})`],
                ['m1', `Module 1 Key Ratio (${count(g1)})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn('px-3 py-1.5 rounded-md text-[11px] font-bold', tab === k ? 'bg-[#00509d] text-white' : 'text-gray-500 hover:bg-slate-100')}
              >
                {label}
              </button>
            ))}
          </div>
          {!loaded && <p className="px-5 py-4 text-[12px] text-gray-400">Loading key ratios…</p>}
          {loaded && !groups.length && (
            <p className="px-5 py-4 text-[12px] text-gray-500">{tab === 'm6' ? 'No Module 6 key ratios entered for these projects yet.' : 'No Module 1 Key Ratio entered for these projects yet.'}</p>
          )}
          {groups.map((g) => (
            <div key={g.name}>
              <div className="px-5 py-1.5 bg-slate-50 border-y border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">{g.name}</div>
              <div className="divide-y divide-gray-100">
                {g.rows.map((r) => {
                  const reqs = [...new Set(r.cells.map((c) => c?.req).filter(Boolean))]
                  return (
                    <div key={r.label} className="px-5 py-2.5 grid items-center gap-4 hover:bg-slate-50/70" style={{ gridTemplateColumns: grid }}>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-gray-700">{r.label}</p>
                        {reqs.length === 1 && <p className="text-[10px] text-gray-400">Req: {reqs[0]}</p>}
                      </div>
                      {r.cells.map((c, i) => (
                        <div key={i} className={cn('min-w-0 rounded-md px-2 py-1 -mx-2', c?.ok === false && 'bg-red-50')}>
                          {c ? (
                            <>
                              <span className={cn('text-[14px] font-bold', c.ok === false ? 'text-red-600' : c.ok === true ? 'text-green-700' : 'text-gray-800')}>{c.value}</span>
                              {c.unit && <span className="text-[10px] text-gray-400 ml-1">{c.unit}</span>}
                              {reqs.length > 1 && c.req && <p className="text-[10px] text-gray-400">Req: {c.req}</p>}
                            </>
                          ) : (
                            <span className="text-[14px] font-bold text-gray-300">-</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
