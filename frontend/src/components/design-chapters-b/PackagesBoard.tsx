/**
 * Elements list + Packages table with native HTML5 drag & drop (same behaviour as the original):
 * drag an element from the list (or a package row) onto a package, onto "Add Package" (creates a new package)
 * or back onto the Elements list (removes it from its package).
 */
import { Fragment, useState, type DragEvent } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import SelectWithOther from '@/components/shared/SelectWithOther'
import type { ContractPackage, PackageElement } from '@/types/chapters-b'

const CONTRACT_TYPES = ['Direct', 'FOC (Free of Cost)', 'Base Rate', 'Client Supply', 'Single Contractor', 'Multiple Contractors']
const MIME = 'application/json'
type DragElement = string | PackageElement
type DragPayload = { element: DragElement; sourcePackageId: string }

const newElement = (name = ''): PackageElement => ({
  id: Date.now().toString() + Math.random().toString(),
  name,
  type: 'Direct',
  numberOfContractors: '',
  typeOfContractors: '',
  remarks: '',
})

function readPayload(e: DragEvent): { el: PackageElement; key: string; source: string } | null {
  const raw = e.dataTransfer.getData(MIME)
  if (!raw) return null
  let p: DragPayload
  try {
    p = JSON.parse(raw)
  } catch {
    return null
  }
  if (!p.element) return null
  if (typeof p.element === 'object') return { el: p.element, key: p.element.id || p.element.name, source: p.sourcePackageId }
  return { el: newElement(p.element), key: p.element, source: p.sourcePackageId }
}

const without = (pkgs: ContractPackage[], source: string, key: string) =>
  source === 'available' ? pkgs : pkgs.map((c) => (c.id.toString() === source ? { ...c, elements: c.elements.filter((d) => d.id !== key && d.name !== key) } : c))

export default function PackagesBoard({
  elements,
  setElements,
  packages,
  setPackages,
}: {
  elements: string[]
  setElements: (e: string[]) => void
  packages: ContractPackage[]
  setPackages: (fn: (p: ContractPackage[]) => ContractPackage[]) => void
}) {
  const [dragging, setDragging] = useState<DragElement | null>(null)
  const [overPkg, setOverPkg] = useState<number | null>(null)
  const [newName, setNewName] = useState('')

  const startDrag = (e: DragEvent, element: DragElement, source: number | null = null) => {
    e.dataTransfer.setData(MIME, JSON.stringify({ element, sourcePackageId: source !== null ? String(source) : 'available' }))
    setDragging(element)
  }
  const over = (e: DragEvent, pkgId: number | null = null) => {
    e.preventDefault()
    if (pkgId !== null) setOverPkg(pkgId)
  }
  const endDrag = () => {
    setDragging(null)
    setOverPkg(null)
  }

  const dropOn = (e: DragEvent, target: number | 'available') => {
    e.preventDefault()
    const p = readPayload(e)
    setDragging(null)
    if (!p) return
    if (target === 'available') {
      if (p.source !== 'available') setPackages((pkgs) => without(pkgs, p.source, p.key))
      return
    }
    setPackages((pkgs) =>
      without(pkgs, p.source, p.key).map((d) =>
        d.id.toString() === target.toString() && !d.elements.some((n) => n.id === p.key || n.name === p.key) ? { ...d, elements: [...d.elements, p.el] } : d,
      ),
    )
  }
  /** drop on the "Add Package" row -> new package containing the element */
  const dropNewPackage = (e: DragEvent) => {
    e.preventDefault()
    const p = readPayload(e)
    setDragging(null)
    if (!p) return
    setPackages((pkgs) => {
      const rest = without(pkgs, p.source, p.key)
      return [...rest, { id: Date.now(), name: `Package ${rest.length + 1}`, elements: [p.el] }]
    })
  }

  const addElementToList = () => {
    const t = newName.trim()
    if (!t) {
      toast.error('Please enter an element name')
      return
    }
    if (elements.includes(t)) {
      toast.error('Element already exists in the list')
      setNewName('')
      return
    }
    setElements([...elements, t])
    setNewName('')
    toast.success('Element added successfully!')
  }

  const editPkg = (id: number, name: string) => setPackages((p) => p.map((x) => (x.id === id ? { ...x, name } : x)))
  const editEl = (pkgId: number, key: string, field: keyof PackageElement, value: string) =>
    setPackages((p) => p.map((x) => (x.id === pkgId ? { ...x, elements: x.elements.map((o) => (o.id === key || o.name === key ? { ...o, [field]: value } : o)) } : x)))
  const removeEl = (pkgId: number, key: string) =>
    setPackages((p) => p.map((x) => (x.id === pkgId ? { ...x, elements: x.elements.filter((a) => a.id !== key && a.name !== key) } : x)))
  const addBlankEl = (pkgId: number) => setPackages((p) => p.map((x) => (x.id === pkgId ? { ...x, elements: [...x.elements, newElement()] } : x)))
  const addPackage = () => setPackages((p) => [...p, { id: Date.now(), name: `Package ${p.length + 1}`, elements: [] }])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
      {/* Elements */}
      <div className="lg:col-span-3">
        <div className="bg-[#006080] text-white p-3 rounded-t-xl text-center font-bold">Elements</div>
        <div className="bg-white border border-[#006080] border-t-0 rounded-b-xl min-h-[400px] p-2 space-y-2 flex flex-col">
          <div className="flex gap-2 p-2 border-b border-gray-200">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addElementToList()
                }
              }}
              placeholder="New element..."
              className="h-8 text-xs flex-1 shadow-sm border-gray-300"
            />
            <button
              onClick={addElementToList}
              className="h-8 w-8 rounded bg-[#006080] hover:bg-[#004d66] text-white flex items-center justify-center transition-colors shrink-0"
              type="button"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto" onDragOver={(e) => over(e)} onDrop={(e) => dropOn(e, 'available')}>
            {elements.map((t) => (
              <div
                key={t}
                draggable
                onDragStart={(e) => startDrag(e, t)}
                onDragEnd={endDrag}
                className="p-3 border-b border-dashed border-gray-300 text-sm font-semibold text-[#006080] cursor-grab active:cursor-grabbing hover:bg-blue-50 flex items-center gap-2 group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#006080]" />
                <span className="flex-1">{t}</span>
                <button onClick={() => setElements(elements.filter((x) => x !== t))} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="p-4 text-center mt-4">
              <p className="text-xs text-gray-400 font-medium italic">
                Drag and drop elements
                <br />
                into packages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="lg:col-span-9">
        <div className="bg-[#006080] text-white p-3 rounded-t-xl text-center font-bold">Packages</div>
        <div className="bg-white border border-[#006080] border-t-0 rounded-b-xl min-h-[400px] p-0 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#e6f4ea] border-b border-gray-300">
                  <th className="p-3 text-sm font-bold text-gray-800 w-48">Package Name</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Type</th>
                  <th className="p-3 text-sm font-semibold text-gray-700 w-32"># of Contractors</th>
                  <th className="p-3 text-sm font-semibold text-gray-700 w-48">Type of Contractors</th>
                  <th className="p-3 text-sm font-semibold text-gray-700 w-64">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {packages.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="bg-gray-100/80 border-t-2 border-gray-200">
                      <td colSpan={5} className="p-2 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#006080]" />
                          <Input
                            value={t.name}
                            onChange={(e) => editPkg(t.id, e.target.value)}
                            className="h-7 text-sm font-bold text-[#006080] border-transparent hover:border-gray-300 px-2 bg-transparent max-w-[250px] shadow-none"
                          />
                        </div>
                      </td>
                    </tr>
                    {t.elements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-0 border-b border-dashed border-gray-300">
                          <div className="py-6 px-6 text-xs text-gray-400 italic text-center min-h-[60px]" onDragOver={(e) => over(e)} onDrop={(e) => dropOn(e, t.id)}>
                            Drag &amp; Drop elements here...
                          </div>
                        </td>
                      </tr>
                    ) : (
                      t.elements.map((r) => {
                        const key = r.id || r.name
                        return (
                          <tr
                            key={key}
                            draggable
                            onDragStart={(e) => startDrag(e, r, t.id)}
                            onDragEnd={endDrag}
                            className="bg-white hover:bg-blue-50/50 group border-b border-dashed border-gray-200"
                          >
                            <td className="p-3 pl-8 flex items-center gap-2 cursor-grab active:cursor-grabbing">
                              <GripVertical size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              <Input
                                value={r.name || ''}
                                onChange={(e) => editEl(t.id, key, 'name', e.target.value)}
                                placeholder="Element Name"
                                className="h-8 text-xs font-semibold text-gray-700 border-transparent hover:border-gray-300 focus-visible:border-blue-500 shadow-none px-2 flex-1"
                              />
                              <button onClick={() => removeEl(t.id, key)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </td>
                            <td className="p-3">
                              <SelectWithOther
                                options={CONTRACT_TYPES}
                                value={r.type || ''}
                                onChange={(v) => editEl(t.id, r.name, 'type', v)}
                                fieldKey="contractingType"
                                triggerClassName="h-8 data-[size=default]:h-8 text-xs bg-white border-gray-300 shadow-sm rounded-md w-full"
                                inputClassName="h-8 text-xs bg-white border-gray-300 shadow-sm rounded-md flex-1"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={r.numberOfContractors}
                                onChange={(e) => editEl(t.id, key, 'numberOfContractors', e.target.value)}
                                placeholder="e.g. 3"
                                className="h-8 text-xs border-gray-300 text-center shadow-sm"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={r.typeOfContractors}
                                onChange={(e) => editEl(t.id, key, 'typeOfContractors', e.target.value)}
                                placeholder="e.g. EPC"
                                className="h-8 text-xs border-gray-300 shadow-sm"
                              />
                            </td>
                            <td className="p-3">
                              <Input value={r.remarks || ''} onChange={(e) => editEl(t.id, key, 'remarks', e.target.value)} placeholder="Remarks" className="h-8 text-xs border-gray-300 shadow-sm" />
                            </td>
                          </tr>
                        )
                      })
                    )}
                    <tr>
                      <td
                        colSpan={5}
                        className={`border-b border-gray-300 transition-colors ${overPkg === t.id && dragging ? 'bg-blue-50 border-dashed border-[#006080]' : 'bg-white'}`}
                        onDragOver={(e) => over(e, t.id)}
                        onDragLeave={() => setOverPkg((s) => (s === t.id ? null : s))}
                        onDrop={(e) => {
                          setOverPkg(null)
                          dropOn(e, t.id)
                        }}
                      >
                        {overPkg === t.id && dragging ? (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-[#006080]">
                            <Plus size={14} /> Drop here to add to {t.name}
                          </div>
                        ) : (
                          <button
                            onClick={() => addBlankEl(t.id)}
                            className="flex items-center gap-1 text-xs font-bold text-[#006080] hover:text-[#004050] transition-colors pl-6 py-3 w-full text-left"
                          >
                            <Plus size={14} /> Add Element
                          </button>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                ))}
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 border-t border-gray-300 bg-gray-50/50 border-dashed hover:bg-gray-100 transition-colors"
                    onDragOver={(e) => over(e)}
                    onDrop={dropNewPackage}
                  >
                    <div className="flex items-center gap-4">
                      <button onClick={addPackage} className="flex items-center gap-2 text-[#00509d] font-bold text-sm hover:text-blue-800 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-[#00509d] text-white flex items-center justify-center">
                          <Plus size={16} />
                        </div>
                        Add Package
                      </button>
                      <div className="h-[1px] bg-gray-800 flex-1 relative hidden md:block">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-gray-800 transform rotate-45" />
                      </div>
                      <div className="bg-white border border-gray-300 px-4 py-2 rounded text-xs font-semibold text-gray-500 italic hidden md:block">
                        Option to drop elements from an exhaustive list to existing &amp; new packages
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
