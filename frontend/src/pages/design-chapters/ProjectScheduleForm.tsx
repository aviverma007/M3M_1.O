import { Fragment, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, Check, ChevronDown, ChevronRight, ImagePlus, LoaderCircle, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import PageLoader from '@/components/common/PageLoader'
import { BackLink, SubmitFooter } from '@/components/design-chapters-b/PageChrome'
import ScheduleEntryRow from '@/components/design-chapters-b/ScheduleEntryRow'
import ScheduleSummary from '@/components/design-chapters-b/ScheduleSummary'
import { DEFAULT_SECTIONS, EMPTY_ENTRY, daysBetween, formatDuration, withField } from '@/components/design-chapters-b/scheduleUtils'
import { saveSummary, uploadFile, useSummaryLoader } from '@/api/chapters-b'
import { ApiError } from '@/api/http'
import { cn } from '@/lib/utils'
import type { MasterSchedule, ScheduleEntry, ScheduleSection, UploadedImage } from '@/types/chapters-b'

type Editing = { type: 'master' | 'sub'; masterId: number; subId?: number; values: ScheduleEntry } | null
const th = 'px-6 py-4 text-[10px] font-bold uppercase tracking-wider'
const iconBtn = 'p-1.5 rounded-lg transition-colors'

export default function ProjectScheduleForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<MasterSchedule[]>([])
  const [newMaster, setNewMaster] = useState<ScheduleEntry>({ ...EMPTY_ENTRY })
  const [newSubs, setNewSubs] = useState<Record<number, ScheduleEntry>>({})
  const [editing, setEditing] = useState<Editing>(null)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [sections, setSections] = useState<ScheduleSection[]>(DEFAULT_SECTIONS)

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      const d = s?.projectScheduleData
      if (!d) return
      if (d.schedules) setSchedules(d.schedules)
      if (d.sections) setSections(d.sections)
      if (d.uploadedImages) setImages(d.uploadedImages)
      else if (d.uploadedFile) setImages([d.uploadedFile])
    },
    { label: 'project schedule' },
  )

  const addMaster = () => {
    if (!newMaster.task || !newMaster.start) {
      toast.error('Please enter master schedule name and start date')
      return
    }
    const d = daysBetween(newMaster.start, newMaster.finish)
    setSchedules((s) => [...s, { ...newMaster, duration: newMaster.duration || String(d || ''), id: Date.now(), expanded: true, subTasks: [] }])
    setNewMaster({ ...EMPTY_ENTRY })
  }

  const addSub = (masterId: number) => {
    const a = newSubs[masterId] || { ...EMPTY_ENTRY }
    if (!a.task || !a.start) {
      toast.error('Please enter sub-schedule name and start date')
      return
    }
    const m = schedules.find((x) => x.id === masterId)
    if (m?.start && a.start && new Date(a.start) < new Date(m.start)) {
      toast.error(`Start date must be on or after master schedule start (${m.start})`)
      return
    }
    if (m?.finish && a.finish && new Date(a.finish) > new Date(m.finish)) {
      toast.error(`Finish date must be on or before master schedule finish (${m.finish})`)
      return
    }
    const d = daysBetween(a.start, a.finish)
    setSchedules((s) => s.map((x) => (x.id === masterId ? { ...x, subTasks: [...(x.subTasks || []), { ...a, duration: a.duration || String(d || ''), id: Date.now() }] } : x)))
    setNewSubs((r) => ({ ...r, [masterId]: { ...EMPTY_ENTRY } }))
  }

  const removeMaster = (id: number) => {
    setSchedules((s) => s.filter((x) => x.id !== id))
    setNewSubs((r) => {
      const n = { ...r }
      delete n[id]
      return n
    })
  }
  const removeSub = (masterId: number, subId: number) =>
    setSchedules((s) => s.map((x) => (x.id === masterId ? { ...x, subTasks: x.subTasks.filter((r) => r.id !== subId) } : x)))
  const toggle = (id: number) => setSchedules((s) => s.map((x) => (x.id === id ? { ...x, expanded: !x.expanded } : x)))

  const editField = (k: keyof ScheduleEntry, v: string) => setEditing((e) => (e ? { ...e, values: withField(e.values, k, v) } : e))
  const commitEdit = () => {
    if (!editing) return
    const { type, masterId, subId, values: n } = editing
    if (!n.task || !n.start) {
      toast.error('Task name and start date are required')
      return
    }
    if (type === 'master') setSchedules((s) => s.map((x) => (x.id === masterId ? { ...x, ...n } : x)))
    else {
      const m = schedules.find((x) => x.id === masterId)
      if (m?.start && n.start && new Date(n.start) < new Date(m.start)) {
        toast.error(`Start date must be on or after master start (${m.start})`)
        return
      }
      if (m?.finish && n.finish && new Date(n.finish) > new Date(m.finish)) {
        toast.error(`Finish date must be on or before master finish (${m.finish})`)
        return
      }
      setSchedules((s) => s.map((x) => (x.id === masterId ? { ...x, subTasks: x.subTasks.map((p) => (p.id === subId ? { ...p, ...n } : p)) } : x)))
    }
    setEditing(null)
  }

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    const done: UploadedImage[] = []
    for (const f of files) {
      try {
        const url = await uploadFile(f)
        if (url) done.push({ name: f.name, url, size: (f.size / (1024 * 1024)).toFixed(2) + ' MB' })
        else toast.error(`Upload failed for "${f.name}"`)
      } catch {
        toast.error(`Failed to upload "${f.name}"`)
      }
    }
    if (done.length) {
      setImages((i) => [...i, ...done])
      toast.success(`${done.length} image${done.length > 1 ? 's' : ''} uploaded successfully`)
    }
    setUploading(false)
    e.target.value = ''
  }

  const submit = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { projectScheduleData: { schedules, sections, uploadedImages: images } })
      toast.success('Project Schedule saved successfully!')
      navigate(-1)
    } catch (e) {
      toast.error(e instanceof ApiError && e.errorCode !== 'VIEW_ONLY' && e.message ? e.message : 'Failed to save project schedule')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const editActions = (size: number) => (
    <div className="flex items-center justify-center gap-1">
      <button onClick={commitEdit} className={`text-green-500 hover:bg-green-50 ${iconBtn}`}>
        <Check size={size} />
      </button>
      <button onClick={() => setEditing(null)} className={`text-gray-400 hover:bg-gray-100 ${iconBtn}`}>
        <X size={size} />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1600px] mx-auto mb-6">
        <BackLink label="Project Schedule" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Add master schedules and their sub-schedules</p>
      </div>

      <div className="max-w-[1600px] mx-auto flex flex-col gap-8 mb-24">
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-5 border-b flex flex-wrap gap-4 justify-between items-center bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00509d]/10 flex items-center justify-center text-[#00509d]">
                <Calendar size={18} />
              </div>
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Project Schedule</h2>
            </div>
            <div>
              <input type="file" id="upload-gantt" className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp" multiple onChange={onUpload} disabled={uploading} />
              <label
                htmlFor="upload-gantt"
                className={cn(
                  'bg-[#4caf50] hover:bg-[#43a047] text-white h-9 px-4 rounded-xl text-[11px] font-bold gap-2 flex items-center cursor-pointer transition-colors',
                  uploading && 'opacity-50 cursor-not-allowed',
                )}
              >
                {uploading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus size={16} />
                    Upload Schedule Images
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#00509d] text-white">
                  <th className={`${th} w-[35%]`}>Task</th>
                  <th className={`${th} w-[16%]`}>Duration Days</th>
                  <th className={`${th} w-[18%]`}>Start</th>
                  <th className={`${th} w-[18%]`}>Finish</th>
                  <th className={`${th} w-12 text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((t) => {
                  const em = editing?.type === 'master' && editing.masterId === t.id
                  const mCls = 'h-9 text-[12px] font-bold bg-white border-blue-200 rounded-xl'
                  return (
                    <Fragment key={t.id}>
                      <tr className="bg-[#eef4fb] border-l-4 border-l-[#00509d] border-b border-gray-100">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <button onClick={() => toggle(t.id)} className="text-[#00509d] hover:bg-blue-100 p-1 rounded transition-colors flex-shrink-0">
                            {t.expanded !== false ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          {em ? (
                            <Input autoFocus value={editing.values.task} onChange={(e) => editField('task', e.target.value)} className={`${mCls} flex-1`} />
                          ) : (
                            <span className="text-[13px] font-black text-[#00509d]">{t.task}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {em ? (
                            <Input value={editing.values.duration} onChange={(e) => editField('duration', e.target.value)} className={mCls} placeholder="Days" />
                          ) : (
                            <span className="px-2 text-[12px] font-bold text-gray-700">{formatDuration(t.duration)}</span>
                          )}
                        </td>
                        {(['start', 'finish'] as const).map((k) => (
                          <td key={k} className="px-4 py-3">
                            {em ? (
                              <Input type="date" value={editing.values[k]} onChange={(e) => editField(k, e.target.value)} className={mCls} />
                            ) : (
                              <span className="px-2 text-[12px] font-bold text-gray-700">{t[k]}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          {em ? (
                            editActions(15)
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditing({ type: 'master', masterId: t.id, values: { task: t.task, duration: t.duration, start: t.start, finish: t.finish } })}
                                className={`text-gray-400 hover:text-[#00509d] hover:bg-blue-50 ${iconBtn}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => removeMaster(t.id)} className={`text-gray-300 hover:text-red-500 hover:bg-red-50 ${iconBtn}`}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {t.expanded !== false && (
                        <>
                          {(t.subTasks || []).map((s) => {
                            const es = editing?.type === 'sub' && editing.masterId === t.id && editing.subId === s.id
                            const sCls = 'h-8 text-[12px] bg-white border-gray-200 rounded-lg'
                            return (
                              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                <td className="px-4 py-2 pl-14 text-[12px] font-semibold text-gray-700">
                                  {es ? (
                                    <Input autoFocus value={editing.values.task} onChange={(e) => editField('task', e.target.value)} className={sCls} />
                                  ) : (
                                    <>
                                      <span className="text-gray-300 mr-2">—</span>
                                      {s.task}
                                    </>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {es ? (
                                    <Input value={editing.values.duration} onChange={(e) => editField('duration', e.target.value)} className={sCls} placeholder="Days" />
                                  ) : (
                                    <span className="text-[12px] text-gray-600">{formatDuration(s.duration)}</span>
                                  )}
                                </td>
                                {(['start', 'finish'] as const).map((k) => (
                                  <td key={k} className="px-4 py-2">
                                    {es ? (
                                      <Input type="date" value={editing.values[k]} min={t.start || undefined} onChange={(e) => editField(k, e.target.value)} className={sCls} />
                                    ) : (
                                      <span className="text-[12px] text-gray-600">{s[k]}</span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-center">
                                  {es ? (
                                    editActions(14)
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() =>
                                          setEditing({ type: 'sub', masterId: t.id, subId: s.id, values: { task: s.task, duration: s.duration, start: s.start, finish: s.finish } })
                                        }
                                        className={`text-gray-400 hover:text-[#00509d] hover:bg-blue-50 ${iconBtn}`}
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button onClick={() => removeSub(t.id, s.id)} className={`text-gray-300 hover:text-red-500 hover:bg-red-50 ${iconBtn}`}>
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                          <ScheduleEntryRow
                            value={newSubs[t.id] || { ...EMPTY_ENTRY }}
                            onChange={(v) => setNewSubs((n) => ({ ...n, [t.id]: v }))}
                            onAdd={() => addSub(t.id)}
                            placeholder="Add sub-schedule…"
                            minDate={t.start || undefined}
                          />
                        </>
                      )}
                    </Fragment>
                  )
                })}
                <tr>
                  <td colSpan={5} className="px-6 pt-5 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00509d]">+ Add Master Schedule</p>
                  </td>
                </tr>
                <ScheduleEntryRow value={newMaster} onChange={setNewMaster} onAdd={addMaster} placeholder="Master schedule name (e.g. Construction Schedule – Overall)" isOverall />
              </tbody>
            </table>
          </div>

          {images.length > 0 && (
            <div className="px-8 py-4 border-t border-gray-100 flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Uploaded Schedule Images</p>
              {images.map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-[12px] font-bold">
                  <ImagePlus size={15} className="text-green-600 flex-shrink-0" />
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate text-green-700 flex-1">
                    {t.name}
                  </a>
                  <span className="text-[10px] text-green-500 font-normal flex-shrink-0">({t.size})</span>
                  <button onClick={() => setImages((s) => s.filter((_, r) => r !== i))} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ScheduleSummary sections={sections} onChange={setSections} />
      </div>
      <SubmitFooter saving={saving} onSubmit={submit} />
    </div>
  )
}
