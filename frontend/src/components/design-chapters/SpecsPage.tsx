/**
 * Shared implementation of the original IDSpecificationsForm / CommonAreaForm pages:
 * List of Area (chapters) | Area of Unit (rooms) | Project Specs (fields from the Apartment/Common
 * Design catalogue with per-category benchmarks) | Marketing. Saved to the design-brief summary.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, ChevronLeft, Eye, EyeOff, FileDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/common/PageLoader'
import SelectWithOther from '@/components/shared/SelectWithOther'
import { cn } from '@/lib/utils'
import { errorMessage, getModuleChapters, getProject, getSummary, saveSummary } from '@/api/chapters-a'
import type { ModuleChapter, SectionField, SpecData, SpecEntry, SpecValue } from '@/types/chapters-a'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui'

export type Item = { id: string; name: string }

export type SpecsConfig = {
  title: string
  moduleId: number
  dataKey: 'idSpecificationsData' | 'commonAreaData'
  chapters: Item[]
  /** chapter id -> catalogue chapter number */
  chapterNumber: Record<string, number>
  /** chapter number -> room id -> catalogue section title */
  sectionTitles: Record<number, Record<string, string>>
  rooms: (chapterId: string) => Item[]
  initialChapter: string
  initialRoom: string
  initialData: SpecData
  /** normalised field name -> state key (compared with key.toLowerCase(), like the original) */
  aliases: Record<string, string>
  emptyEntry: SpecEntry
  /** state keys tried, in order, when mapping a catalogue field to a state key */
  fieldKeys: string[]
  defaultOptions: Record<string, string[]>
  /** Common Area: keep ceiling sections for "ceiling" and the rest for "wall" */
  splitWallCeiling?: boolean
  /** ID Specifications: rooms can be hidden/restored, fixed-height scrolling lists, "other toilets" fallback */
  idLayout?: boolean
  saveSuccess: string
  saveError: string
  loadErrorLabel: string
}

const norm = (s?: string | null) => (s ? s.toLowerCase().replace(/[\r\n]+/g, ' ').replace(/[^a-z0-9]/g, '') : '')

const categoryKey = (c?: string | null) => {
  const v = (c || '').toLowerCase()
  if (v === 'premium') return 'premiumAns'
  if (v === 'affluent') return 'affluentAns'
  if (v === 'hi_street') return 'hiStreetAns'
  if (v === 'enclosed_mall') return 'enclosedMallAns'
  return 'midEndAns'
}

/** true / false / null(no benchmark) — same rules as the original */
function matchesBenchmark(value: SpecValue | undefined, bench: string[]) {
  if (!value || !Array.isArray(bench) || bench.length === 0) return null
  const b = bench.map((o) => String(o).trim().toLowerCase())
  if (Array.isArray(value)) return value.length === 0 ? null : value.every((o) => b.includes(String(o).trim().toLowerCase()))
  if (typeof value === 'string') return value.trim() ? b.includes(value.trim().toLowerCase()) : null
  return false
}

const CHECK_LIST_CLS = 'grid grid-cols-2 gap-2 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-40 overflow-y-auto'
const NOTE = 'text-[10px] text-gray-400 font-bold italic'

export default function SpecsPage({ cfg }: { cfg: SpecsConfig }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [chapter, setChapter] = useState(cfg.initialChapter)
  const [room, setRoom] = useState(cfg.initialRoom)
  const [data, setData] = useState<SpecData>(cfg.initialData)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [category, setCategory] = useState('mid-end')
  const [chapterList, setChapterList] = useState<ModuleChapter[]>([])
  const [active, setActive] = useState<ModuleChapter | null>(null)
  const [sectionLoading, setSectionLoading] = useState(false)

  /* ---- load saved data, project category, chapter list ---- */
  useEffect(() => {
    ;(async () => {
      try {
        const s = await getSummary(projectId!)
        const saved = s?.[cfg.dataKey]
        if (saved) {
          setData(saved)
          const h = (saved as SpecData).__hidden
          if (cfg.idLayout && Array.isArray(h)) setHidden(new Set(h))
        }
        setCategory((await getProject(projectId!))?.category || 'mid-end')
        setChapterList(await getModuleChapters(projectId!, cfg.moduleId))
      } catch (e) {
        console.error(`Error fetching ${cfg.loadErrorLabel}:`, e)
      } finally {
        setTimeout(() => setLoading(false), 500)
      }
    })()
  }, [projectId, cfg])

  /* ---- load the active chapter's sections ---- */
  useEffect(() => {
    const num = cfg.chapterNumber[chapter]
    if (!num || chapterList.length === 0) return
    const ch = chapterList.find((c) => c.chapterNumber === num)
    if (!ch) return
    ;(async () => {
      setSectionLoading(true)
      try {
        const rows = await getModuleChapters(projectId!, cfg.moduleId, ch.id)
        setActive(rows.find((r) => r.id === ch.id) || null)
      } catch (e) {
        console.error('Error fetching active chapter details:', e)
      } finally {
        setSectionLoading(false)
      }
    })()
  }, [chapter, chapterList, projectId, cfg])

  const rooms = useMemo(() => cfg.rooms(chapter), [cfg, chapter])
  useEffect(() => {
    if (rooms.length > 0 && !rooms.some((r) => r.id === room)) setRoom(rooms[0].id)
  }, [chapter, rooms, room])

  const entryKey = `${chapter}_${room}`
  const entry = ((data[entryKey] as SpecEntry | undefined) || cfg.emptyEntry) as SpecEntry
  const setField = (key: string, value: SpecValue) =>
    setData((d) => ({ ...d, [entryKey]: { ...cfg.emptyEntry, ...((d[entryKey] as SpecEntry) || {}), [key]: value } }))

  /* ---- catalogue lookups ---- */
  const keyMatches = (fieldName: string, key: string) => {
    const n = norm(fieldName)
    const k = key.toLowerCase()
    return n === k || cfg.aliases[n] === k
  }
  const sectionAllowed = (title: string) => {
    if (!cfg.splitWallCeiling) return true
    const t = norm(title)
    return !((chapter === 'ceiling' && !t.includes('ceiling')) || (chapter === 'wall' && t.includes('ceiling')))
  }
  const sectionTitle = (roomId: string) => cfg.sectionTitles[cfg.chapterNumber[chapter]]?.[roomId] || ''

  const findField = (key: string): SectionField | null => {
    if (!active?.chapterSections) return null
    let field: SectionField | undefined
    const title = sectionTitle(room)
    if (title) {
      const t = norm(title)
      const sec =
        active.chapterSections.find((s) => sectionAllowed(s.title) && norm(s.title) === t) ||
        active.chapterSections.find((s) => {
          const c = norm(s.title)
          return sectionAllowed(s.title) && (c.includes(t) || t.includes(c))
        })
      field = sec?.sectionFields?.find((f) => keyMatches(f.fieldName, key))
    }
    if (!field)
      for (const s of active.chapterSections) {
        if (!sectionAllowed(s.title) || !s.sectionFields) continue
        field = s.sectionFields.find((f) => keyMatches(f.fieldName, key))
        if (field) break
      }
    return field ?? null
  }

  const benchmarkOf = (key: string) => {
    const f = findField(key)
    if (!f) return null
    const k = categoryKey(category) as keyof SectionField
    return {
      midEndAns: f.midEndAns || [],
      premiumAns: f.premiumAns || [],
      affluentAns: f.affluentAns || [],
      active: (f[k] as string[] | undefined) || [],
      fieldName: f.fieldName,
    }
  }

  const fieldLabel = (label: string, key: string) => {
    const b = benchmarkOf(key)
    return (
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {b && (
          <HoverCard>
            <HoverCardTrigger className="cursor-pointer inline-flex items-center text-gray-400 hover:text-[#00509d] transition-colors">
              <Info size={13} className="ml-1 shrink-0" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4 bg-white border border-gray-100 rounded-xl shadow-lg z-50 text-xs text-left" align="end">
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 border-b pb-1.5 mb-2 flex items-center justify-between">
                  <span>Benchmarks - {b.fieldName}</span>
                </h4>
                <div className="space-y-2">
                  {[
                    { key: 'mid-end', label: 'Mid-End', val: b.midEndAns },
                    { key: 'premium', label: 'Premium', val: b.premiumAns },
                    { key: 'affluent', label: 'Affluent', val: b.affluentAns },
                  ].map(({ key: k, label: l, val }) => {
                    const on = category === k
                    return (
                      <div key={k} className={cn('p-2 rounded-lg transition-colors', on ? 'bg-blue-50/70 border border-blue-100' : 'bg-gray-50/30')}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn('font-bold text-[9px] uppercase tracking-wider', on ? 'text-blue-700' : 'text-gray-400')}>{l}</span>
                          {on && (
                            <span className="text-[8px] bg-[#00509d] text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider scale-95 origin-right">
                              Active Category
                            </span>
                          )}
                        </div>
                        <p className={cn('text-xs font-medium leading-relaxed mt-0.5', on ? 'text-blue-900' : 'text-gray-700')}>
                          {Array.isArray(val) && val.length > 0 ? val.join(', ') : 'No benchmark specified'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    )
  }

  const benchmarkStatus = (value: SpecValue, key: string) => {
    const b = benchmarkOf(key)
    if (!b) return <p className={NOTE}>No benchmark specified</p>
    if (!(Array.isArray(value) ? value.length > 0 : value && String(value).trim() !== '')) return <p className={NOTE}>Please select an option</p>
    if (!b.active.length) return <p className={NOTE}>No benchmark specified for this category</p>
    const m = matchesBenchmark(value, b.active)
    if (m === true) return <p className="text-[10px] text-green-500 font-bold italic">Selected option matches the benchmark</p>
    if (m === false) return <p className="text-[10px] text-red-500 font-bold italic">Selected value does not match benchmark</p>
    return <p className={NOTE}>No benchmark specified</p>
  }

  const catalogueOptions = (key: string) =>
    (findField(key)?.sectionFieldOptions ?? []).map((o) => o.fieldOption).filter((o) => o && o.trim() !== '')

  const renderSelect = (label: string, key: string, defaults: string[], placeholder = 'Select option') => {
    const raw = entry[key]
    const value = Array.isArray(raw) ? raw[0] || '' : raw || ''
    let options = [...defaults]
    const fromCatalogue = catalogueOptions(key)
    if (fromCatalogue.length > 0) {
      options = fromCatalogue
      if (!options.map((o) => o.toLowerCase().trim()).includes('na')) options.push('NA')
    }
    return (
      <div key={`${key}-${label}`} className="space-y-2">
        {fieldLabel(label, key)}
        <SelectWithOther
          options={options}
          value={value}
          onChange={(v) => setField(key, v)}
          placeholder={placeholder}
          triggerClassName="h-11 data-[size=default]:h-11 bg-gray-50 border-gray-100 rounded-xl focus:bg-white transition-colors w-full"
          inputClassName="h-11 bg-gray-50 border-gray-100 rounded-xl focus:bg-white flex-1"
        />
        {benchmarkStatus(value, key)}
      </div>
    )
  }

  const renderMulti = (label: string, key: string, defaults: string[]) => {
    const raw = entry[key]
    const selected = Array.isArray(raw) ? raw : raw ? [raw] : []
    const fromCatalogue = catalogueOptions(key)
    const options = fromCatalogue.length > 0 ? fromCatalogue : defaults
    return (
      <div key={`${key}-${label}`} className="space-y-2">
        {fieldLabel(label, key)}
        <div className={CHECK_LIST_CLS}>
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 p-1.5 hover:bg-gray-100/50 rounded-lg cursor-pointer transition-colors text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={(e) => setField(key, e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))}
                className="w-4 h-4 rounded border-gray-300 text-[#00509d] focus:ring-[#00509d]/20 transition-all cursor-pointer"
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
        {benchmarkStatus(selected, key)}
      </div>
    )
  }

  /* original: a "select" field renders as select unless the catalogue says multiselect, and vice versa */
  const renderSelectField = (label: string, key: string, defaults: string[], placeholder?: string) =>
    findField(key)?.fieldType === 'multiselect' ? renderMulti(label, key, defaults) : renderSelect(label, key, defaults, placeholder)
  const renderMultiField = (label: string, key: string, defaults: string[]) =>
    findField(key)?.fieldType === 'select' ? renderSelect(label, key, defaults) : renderMulti(label, key, defaults)

  const renderSpecs = () => {
    if (!active) return <div className="text-center py-12 text-sm text-gray-500">No data found in database.</div>
    const sections = active.chapterSections ?? []
    const title = sectionTitle(room)
    let matched: typeof sections = []
    if (title) {
      const t = norm(title)
      matched = sections.filter((s) => sectionAllowed(s.title) && norm(s.title) === t)
      if (matched.length === 0)
        matched = sections.filter((s) => {
          const c = norm(s.title)
          return sectionAllowed(s.title) && (c.includes(t) || t.includes(c))
        })
      if (matched.length === 0 && cfg.idLayout && room === 'other-toilets') {
        const mt = norm(sectionTitle('master-toilet'))
        matched = sections.filter((s) => {
          const c = norm(s.title)
          return c === mt || c.includes(mt) || mt.includes(c)
        })
      }
    }
    const fields: SectionField[] = []
    matched.forEach((s) => s.sectionFields?.forEach((f) => fields.some((x) => x.id === f.id) || fields.push(f)))
    if (fields.length === 0) return <div className="text-center py-12 text-sm text-gray-500">No fields specified for this section.</div>
    return fields.map((f) => {
      const key = cfg.fieldKeys.find((k) => keyMatches(f.fieldName, k)) || norm(f.fieldName)
      const defaults = cfg.defaultOptions[key] || []
      return f.fieldType === 'multiselect' ? renderMultiField(f.fieldName, key, defaults) : renderSelectField(f.fieldName, key, defaults, `Select ${f.fieldName}`)
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = cfg.idLayout ? { ...data, __hidden: [...hidden] } : data
      await saveSummary(projectId!, { [cfg.dataKey]: payload })
      toast.success(cfg.saveSuccess)
      navigate(-1)
    } catch (e) {
      console.error(`Error saving ${cfg.loadErrorLabel}:`, e)
      toast.error(errorMessage(e, cfg.saveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const roomName = rooms.find((r) => r.id === room)?.name
  const marketing =
    entry.type && entry.finish && entry.size
      ? `Premium ${entry.type} in ${cfg.idLayout ? roomName || room : roomName} with ${entry.finish} finish (${entry.size})`
      : 'Please select all specifications to see the marketing summary...'

  const panel = cfg.idLayout
    ? 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]'
    : 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]'
  const panelHead = cfg.idLayout ? 'px-6 py-5 border-b flex items-center justify-between shrink-0' : 'px-6 py-5 border-b flex items-center justify-between'
  const listBody = cfg.idLayout ? 'p-4 space-y-3 overflow-y-auto flex-1' : 'p-4 space-y-3'
  const pick = (on: boolean) =>
    cn('px-6 py-4 rounded-xl cursor-pointer transition-all flex items-center gap-4', on ? 'bg-[#4caf50] text-white shadow-lg shadow-green-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100')
  const radio = (on: boolean, extra = '') => (
    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center border-2', extra, on ? 'border-white' : 'border-gray-300')}>
      {on && <Check size={12} strokeWidth={4} />}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1600px] mx-auto mb-6 flex justify-between items-end">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-[#00509d] hover:text-blue-800 font-bold transition-colors mb-4 group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>{cfg.title}</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{cfg.title}</h1>
        </div>
        <Button className="bg-[#4caf50] hover:bg-[#43a047] text-white font-bold gap-2 px-6 h-11 rounded-xl shadow-md border-none">
          <FileDown size={18} /> Import
        </Button>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* List of Area */}
        <div className={panel}>
          <div className={panelHead}>
            <h2 className="text-sm font-black text-[#00509d] uppercase tracking-widest">List of Area</h2>
          </div>
          <div className={listBody}>
            {cfg.chapters.map((c) => (
              <div key={c.id} onClick={() => setChapter(c.id)} className={pick(chapter === c.id)}>
                {radio(chapter === c.id)}
                <span className="font-bold text-sm">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area of Unit */}
        <div className={panel}>
          <div className={panelHead}>
            <h2 className="text-sm font-black text-[#00509d] uppercase tracking-widest">Area of Unit</h2>
          </div>
          <div className={listBody}>
            {cfg.idLayout ? (
              <>
                {rooms
                  .filter((r) => showHidden || !hidden.has(`${chapter}_${r.id}`))
                  .map((r) => {
                    const k = `${chapter}_${r.id}`
                    const isHidden = hidden.has(k)
                    const on = !isHidden && room === r.id
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          'px-4 py-3 rounded-xl transition-all flex items-center gap-3',
                          isHidden
                            ? 'bg-gray-100 text-gray-400 opacity-60'
                            : room === r.id
                              ? 'bg-[#4caf50] text-white shadow-lg shadow-green-100 cursor-pointer'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer',
                        )}
                        onClick={() => !isHidden && setRoom(r.id)}
                      >
                        {radio(on, 'shrink-0')}
                        <span className={cn('font-bold text-sm flex-1', isHidden && 'line-through')}>{r.name}</span>
                        {isHidden ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setHidden((s) => {
                                const n = new Set(s)
                                n.delete(k)
                                return n
                              })
                            }}
                            className="ml-auto text-blue-400 hover:text-blue-600 transition-opacity"
                            title="Restore room"
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setHidden((s) => new Set([...s, k]))
                              if (room === r.id) {
                                const next = rooms.filter((x) => x.id !== r.id && !hidden.has(`${chapter}_${x.id}`))
                                if (next.length > 0) setRoom(next[0].id)
                              }
                            }}
                            className="ml-auto text-gray-300 hover:text-red-400 transition-opacity"
                            title="Hide this room"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                {hidden.size > 0 && (
                  <button onClick={() => setShowHidden((v) => !v)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 text-center">
                    {showHidden ? 'Hide hidden rooms' : `Show ${[...hidden].filter((k) => k.startsWith(chapter + '_')).length} hidden room(s)`}
                  </button>
                )}
              </>
            ) : (
              rooms.map((r) => (
                <div key={r.id} onClick={() => setRoom(r.id)} className={pick(room === r.id)}>
                  {radio(room === r.id)}
                  <span className="font-bold text-sm">{r.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project Specs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h2 className="text-sm font-black text-[#00509d] uppercase tracking-widest">Project Specs</h2>
            <Info size={16} className="text-gray-300" />
          </div>
          <div className={cfg.idLayout ? 'p-6 space-y-6 max-h-[600px] overflow-y-auto' : 'p-6 space-y-6'}>
            {sectionLoading ? <div className="text-center py-12 text-sm text-gray-500">Loading section fields...</div> : renderSpecs()}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Additional Specs (Optional)</label>
              <textarea
                value={(entry.additional as string) ?? ''}
                onChange={(e) => setField('additional', e.target.value)}
                placeholder="Enter any additional specifications..."
                className="w-full min-h-[100px] bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm p-4"
              />
            </div>
          </div>
        </div>

        {/* Marketing */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h2 className="text-sm font-black text-[#00509d] uppercase tracking-widest">Marketing</h2>
            <Info size={16} className="text-gray-300" />
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200 min-h-[200px] flex items-start justify-center">
              <p className="text-sm text-gray-600 leading-relaxed italic font-medium">{marketing}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-8 flex justify-end gap-3 pb-12">
        <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-6 rounded-xl font-bold h-12">
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#00509d] hover:bg-[#003f7a] text-white px-10 py-6 rounded-xl font-bold shadow-lg shadow-blue-100 border-none h-12"
        >
          {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
    </div>
  )
}
