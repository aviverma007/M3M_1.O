/* "Compare with Projects" picker + "Key Ratios Comparison" table on Project Level Design. */
import { useState } from 'react'
import { CircleCheck, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Project } from '@/types'

export type ProjectLite = Pick<Project, 'id' | 'name' | 'location'>
export type Compared = { name: string; location: string; keyRatios: Record<string, string> }

const RATIOS = [
  { key: 'saleableFAR', label: 'Saleable / FAR', std: '1.39' },
  { key: 'buaSaleable', label: 'BUA / Saleable', std: '1.21' },
  { key: 'buaFAR', label: 'BUA / FAR', std: '—' },
  { key: 'coreEfficiency', label: 'Core Efficiency', std: '7%–9%' },
  { key: 'parkingEfficiency', label: 'Parking Efficiency (SQM/car)', std: '32.5' },
  { key: 'carpetSaleable', label: 'Carpet / Saleable', std: '55%' },
  { key: 'loadingFactor', label: 'Loading Factor', std: '—' },
]

export default function CompareSection({
  projects,
  selected,
  setSelected,
  compared,
  current,
}: {
  projects: ProjectLite[]
  selected: string[]
  setSelected: (fn: (s: string[]) => string[]) => void
  compared: Record<string, Compared>
  current: Record<string, string>
}) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()
  const filtered = projects.filter((p) => p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q))
  const loaded = selected.map((id) => compared[id]).filter(Boolean)
  const pending = selected.filter((id) => !compared[id])

  return (
    <>
      <div className="max-w-[1500px] mx-auto mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#00509d] px-6 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Compare with Projects</h3>
              <p className="text-blue-200 text-xs mt-0.5">Select projects to include in the Area Ratios Comparison slide in the DPR</p>
            </div>
            {selected.length > 0 && <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{selected.length} / 5 selected</span>}
          </div>
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm bg-gray-50 border-gray-200" />
            </div>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selected.map((id) => {
                  const p = projects.find((x) => String(x.id) === String(id))
                  return p ? (
                    <span key={id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {p.name}
                      <button type="button" onClick={() => setSelected((s) => s.filter((x) => x !== id))} className="hover:text-blue-900 ml-1">
                        <X size={11} />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {filtered.map((p) => {
                const on = selected.includes(String(p.id))
                const blocked = !on && selected.length >= 5
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (blocked) return
                      const id = String(p.id)
                      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
                    }}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${blocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${on ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${on ? 'bg-[#00509d] border-[#00509d]' : 'border-gray-300'}`}>
                      {on && <CircleCheck size={11} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      {p.location && <p className="text-xs text-gray-400 truncate">{p.location}</p>}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No projects found</p>}
            </div>
          </div>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="max-w-[1500px] mx-auto mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#00509d] px-6 py-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Key Ratios Comparison</h3>
              <p className="text-blue-200 text-xs mt-0.5">Current project vs selected projects</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#dce8f5]">
                    <th className="px-4 py-3 text-left font-bold text-[#00509d] border border-gray-200 w-48">Parameter</th>
                    <th className="px-4 py-3 text-center font-bold text-[#00509d] border border-gray-200 w-24">Std. Target</th>
                    <th className="px-4 py-3 text-center font-bold text-[#00509d] border border-gray-200 min-w-[120px]">This Project</th>
                    {loaded.map((c) => (
                      <th key={c.name} className="px-4 py-3 text-center font-bold text-[#00509d] border border-gray-200 min-w-[120px]">
                        {c.name}
                        {c.location && <div className="text-[10px] text-gray-400 font-normal">{c.location}</div>}
                      </th>
                    ))}
                    {pending.map((id) => (
                      <th key={id} className="px-4 py-3 text-center font-bold text-gray-400 border border-gray-200 min-w-[120px]">
                        Loading...
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RATIOS.map((r, i) => (
                    <tr key={r.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-4 py-2.5 font-semibold text-gray-700 border border-gray-200">{r.label}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500 border border-gray-200">{r.std}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-800 border border-gray-200">{current[r.key] || '—'}</td>
                      {loaded.map((c) => (
                        <td key={c.name} className="px-4 py-2.5 text-center text-gray-700 border border-gray-200">
                          {c.keyRatios?.[r.key] || '—'}
                        </td>
                      ))}
                      {pending.map((id) => (
                        <td key={id} className="px-4 py-2.5 text-center text-gray-300 border border-gray-200">
                          —
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
