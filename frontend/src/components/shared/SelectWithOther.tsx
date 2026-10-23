import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { http, type ApiEnvelope } from '@/api/http'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type SavedOption = { id: number; fieldKey: string; optionValue: string }
const ANY_OTHER = 'Any Other'

/** User-managed extra options for a dropdown (GET/POST/DELETE /metadata/dropdown-options). */
function useDropdownOptions(fieldKey?: string) {
  const [saved, setSaved] = useState<SavedOption[]>([])
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    if (!fieldKey) return
    setLoading(true)
    try {
      const r = await http.get<ApiEnvelope<SavedOption[]>>(`/metadata/dropdown-options/${fieldKey}`)
      setSaved(r.data || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [fieldKey])
  useEffect(() => {
    load()
  }, [load])
  const addOption = useCallback(
    async (value: string) => {
      const v = value.trim()
      if (!v) return
      const r = await http.post<ApiEnvelope<SavedOption>>('/metadata/dropdown-options', { fieldKey, optionValue: v })
      const opt = r.data
      setSaved((s) => (s.find((x) => x.id === opt.id) ? s : [...s, opt]))
      return opt
    },
    [fieldKey],
  )
  const deleteOption = useCallback(async (id: number) => {
    await http.delete(`/metadata/dropdown-options/${id}`)
    setSaved((s) => s.filter((x) => x.id !== id))
  }, [])
  return { saved, loading, addOption, deleteOption }
}

/**
 * Select with an "Any Other" free-text option and (when `fieldKey` is set) a pencil button
 * to manage custom options. Same behaviour/markup as the original's SelectWithOther.
 */
export default function SelectWithOther({
  options = [],
  value = '',
  onChange,
  fieldKey,
  placeholder = 'Select',
  triggerClassName = 'h-9 text-sm bg-white border-gray-200 focus:ring-blue-500 rounded-lg w-full',
  inputClassName = 'h-9 text-sm bg-white border-gray-200 focus:ring-blue-500 rounded-lg flex-1',
}: {
  options?: string[]
  value?: string | null
  onChange: (v: string) => void
  fieldKey?: string
  placeholder?: string
  triggerClassName?: string
  inputClassName?: string
}) {
  const { saved, addOption, deleteOption } = useDropdownOptions(fieldKey)
  const [manageOpen, setManageOpen] = useState(false)
  const [newOption, setNewOption] = useState('')
  const [adding, setAdding] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const savedValues = saved.map((s) => s.optionValue)
  const all = [...options, ...savedValues.filter((s) => !options.includes(s))].filter((o) => o !== ANY_OTHER)
  const isCustom = value === ANY_OTHER || (value !== '' && value !== null && value !== undefined && !all.includes(value))
  const selectValue = isCustom ? ANY_OTHER : value || ''
  const customText = isCustom && value !== ANY_OTHER ? value : ''

  const add = async () => {
    if (!newOption.trim() || !fieldKey) return
    setAdding(true)
    try {
      await addOption(newOption.trim())
      setNewOption('')
    } finally {
      setAdding(false)
    }
  }
  const remove = async (id: number) => {
    await deleteOption(id)
    const opt = saved.find((s) => s.id === id)
    if (opt && value === opt.optionValue) onChange('')
  }

  useEffect(() => {
    if (!manageOpen) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setManageOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [manageOpen])

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center gap-1.5">
        <Select value={selectValue} onValueChange={(v) => onChange(v === ANY_OTHER ? ANY_OTHER : v)}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-white z-[100]">
            {all.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
            <SelectItem value={ANY_OTHER} className="text-blue-600 font-medium">
              Any Other
            </SelectItem>
          </SelectContent>
        </Select>
        {fieldKey && (
          <button
            type="button"
            title="Edit options"
            onClick={() => setManageOpen((o) => !o)}
            className={`h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg border transition-colors ${manageOpen ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 bg-white text-gray-400 hover:text-blue-500 hover:border-blue-300'}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isCustom && (
        <div className="flex gap-1.5 items-center">
          <Input type="text" value={customText} placeholder="Enter custom value..." onChange={(e) => onChange(e.target.value === '' ? ANY_OTHER : e.target.value)} className={inputClassName} autoFocus />
          <button
            type="button"
            onClick={() => onChange('')}
            title="Clear"
            className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {manageOpen && fieldKey && (
        <div ref={panelRef} className="mt-1 p-3 border border-blue-100 rounded-xl bg-blue-50/60 shadow-sm space-y-2">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Manage Options</p>
          {options.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-medium">Default</p>
              {options.map((o) => (
                <div key={o} className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100 text-xs text-gray-500">
                  <span>{o}</span>
                </div>
              ))}
            </div>
          )}
          {saved.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-medium">Custom</p>
              {saved.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100 text-xs text-gray-700">
                  <span>{o.optionValue}</span>
                  <button type="button" onClick={() => remove(o.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2" title="Remove option">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1.5 items-center pt-1">
            <Input
              type="text"
              value={newOption}
              placeholder="New option..."
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
              className="h-8 text-xs bg-white border-gray-200 rounded-lg flex-1"
            />
            <button
              type="button"
              onClick={add}
              disabled={!newOption.trim() || adding}
              className="h-8 px-3 flex items-center gap-1 rounded-lg bg-blue-600 text-white text-xs font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {adding ? <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" /> : <Plus className="h-3 w-3" />}
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
