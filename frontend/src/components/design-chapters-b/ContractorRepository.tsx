import { useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Contractor } from '@/types/chapters-b'

const GRADES = ['Grade A', 'Grade B', 'Grade C']
type Draft = Pick<Contractor, 'name' | 'benchmark' | 'previous' | 'remarks'>
const emptyDraft = (): Draft => ({ name: '', benchmark: '', previous: '', remarks: '' })
const cellInput = 'h-8 text-xs border-transparent hover:border-gray-300 focus-visible:border-blue-500 shadow-none px-2'
const th = 'px-4 py-2 text-xs font-bold text-[#006080]'

/** "Contractor Repository": one table per grade with inline-editable rows and an add row. */
export default function ContractorRepository({ contractors, onChange }: { contractors: Contractor[]; onChange: (c: Contractor[]) => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(GRADES.map((g) => [g, emptyDraft()])))

  const add = (grade: string) => {
    const d = drafts[grade]
    if (!d.name) {
      toast.error('Please enter a contractor name')
      return
    }
    onChange([...contractors, { ...d, grade, id: Date.now() }])
    setDrafts({ ...drafts, [grade]: emptyDraft() })
  }
  const edit = (id: number, key: keyof Contractor, value: string) => onChange(contractors.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
  const setDraft = (grade: string, key: keyof Draft, value: string) => setDrafts({ ...drafts, [grade]: { ...drafts[grade], [key]: value } })

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Contractor Repository</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
        <div className="p-6 flex justify-end">
          <Button variant="outline" className="h-9 px-4 rounded-md text-sm font-bold border-gray-300 text-gray-600 gap-2">
            <Upload size={16} /> Import contractor list for edits
          </Button>
        </div>
        <div className="px-6 pb-8 space-y-8">
          {GRADES.map((grade) => {
            const rows = contractors.filter((c) => c.grade === grade)
            return (
              <div key={grade} className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#006080] text-white p-2 text-center font-bold text-sm">{grade}</div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e6f4ea] border-b border-gray-300">
                      <th className={`${th} w-12 text-center`}>#</th>
                      <th className={th}>Contractor Name</th>
                      <th className={th}>Benchmark Projects</th>
                      <th className={th}>Previous M3M Projects</th>
                      <th className={th}>Remarks</th>
                      <th className={`${th} w-12 text-center`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-center text-sm font-bold text-white bg-[#006080] w-8 h-8 rounded-full flex items-center justify-center mx-auto my-2">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-200">
                          <Input value={r.name} onChange={(e) => edit(r.id, 'name', e.target.value)} className={cellInput} />
                        </td>
                        {(['benchmark', 'previous', 'remarks'] as const).map((k) => (
                          <td key={k} className="px-4 py-3 border-l border-gray-200">
                            <Input value={r[k]} onChange={(e) => edit(r.id, k, e.target.value)} className={cellInput} />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center border-l border-gray-200">
                          <button onClick={() => onChange(contractors.filter((c) => c.id !== r.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/30">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => add(grade)}
                          className="w-8 h-8 rounded-full bg-[#00509d] text-white flex items-center justify-center hover:bg-blue-800 transition-colors mx-auto"
                        >
                          <Plus size={16} />
                        </button>
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200 font-bold text-gray-700 text-sm">
                        <div className="flex items-center gap-4">
                          Add contractor
                          <div className="h-[1px] bg-gray-400 w-32 relative hidden md:block">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-gray-400 transform rotate-45" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200">
                        <Input
                          value={drafts[grade].benchmark}
                          onChange={(e) => setDraft(grade, 'benchmark', e.target.value)}
                          placeholder="Benchmark Projects"
                          className="h-8 text-xs bg-white border-gray-300 shadow-sm px-2"
                        />
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200">
                        <Input
                          value={drafts[grade].previous}
                          onChange={(e) => setDraft(grade, 'previous', e.target.value)}
                          placeholder="Previous M3M Projects"
                          className="h-8 text-xs bg-white border-gray-300 shadow-sm px-2"
                        />
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200">
                        <Input
                          value={drafts[grade].name}
                          onChange={(e) => setDraft(grade, 'name', e.target.value)}
                          placeholder="Contractor Name *"
                          className="h-8 text-xs bg-white border-blue-300 focus-visible:ring-blue-500 shadow-sm px-2"
                        />
                      </td>
                      <td className="px-4 py-3 text-center border-l border-gray-200" />
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
