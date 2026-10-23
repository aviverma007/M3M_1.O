/* Project Details & Layout: /dashboard/project/:projectId/design-chapters/project-details (original ProjectDetailsLayoutForm). */
import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, CircleCheck, FileText, GripVertical, LoaderCircle, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageLoader from '@/components/common/PageLoader'
import { errorMessage, getProject, getSummary, saveSummary, updateProject, uploadFile } from '@/api/chapters-a'
import type { CustomField, LayoutFile, ProjectLayout, TypeRow } from '@/types/chapters-a'

const DEFAULT_LAYOUTS: ProjectLayout[] = [
  { id: 0, name: 'Master Plan', files: [], fixed: true },
  { id: 1, name: 'Site Plan Layout', files: [] },
  { id: 2, name: 'Typical Stilt Floor', files: [] },
  { id: 3, name: 'Typical First Floor', files: [] },
  { id: 4, name: 'Typical Cluster Plan', files: [] },
  { id: 5, name: 'Basement Plan', files: [] },
  { id: 6, name: 'Floorwise Club Layout', files: [] },
]
const emptyUnit = () => ({ type: '', count: '', size: '', area: '', total: '' })
const DEFAULT_ROWS: TypeRow[] = [
  { type: 'Residential', typology: 'G + D + 30', units: [{ ...emptyUnit(), type: '2BHK + S' }, { ...emptyUnit(), type: '3BHK + S' }] },
  { type: 'Retail', typology: 'G + G + 4', units: [{ ...emptyUnit(), type: 'Commercial' }, { ...emptyUnit(), type: 'Office' }] },
  { type: 'Club', typology: 'G + 1', units: [emptyUnit()] },
]
const sumArea = (row: TypeRow) => row.units.reduce((s, u) => s + (parseFloat(String(u.area)) || 0), 0)
const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '')) || 0)

type InfoRow = { key: string; value: string }
const parseInfo = (t?: string): InfoRow[] => {
  if (!t) return [{ key: '', value: '' }]
  const lines = t.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return [{ key: '', value: '' }]
  return lines.map((l) => {
    const i = l.indexOf(':')
    return i > 0 && i < l.length - 1 ? { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { key: l.trim(), value: '' }
  })
}
const joinInfo = (rows: InfoRow[]) =>
  rows
    .filter((r) => r.key.trim() || r.value.trim())
    .map((r) => (r.value.trim() ? `${r.key}: ${r.value}` : r.key))
    .join('\n')

const LBL = 'text-sm font-medium text-gray-600'
const FLD = 'bg-gray-50 border-gray-200'
const CAT_RES = [
  ['mid-end', 'Mid-End'],
  ['premium', 'Premium'],
  ['affluent', 'Affluent'],
]
const CAT_COM = [
  ['hi_street', 'High Street'],
  ['enclosed_mall', 'Enclosed Mall'],
]

export default function ProjectDetailsLayoutForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [sectionImage, setSectionImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [details, setDetails] = useState({ name: '', projectType: '', category: '', location: '', totalArea: '', noOfTowers: '', towerHeight: '' })
  const [layouts, setLayouts] = useState<ProjectLayout[]>(DEFAULT_LAYOUTS)
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [fallbackSaleable, setFallbackSaleable] = useState<number | null>(null)
  const [rows, setRows] = useState<TypeRow[]>(DEFAULT_ROWS)
  const [adding, setAdding] = useState(false)
  const [newLayout, setNewLayout] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [managed, setManaged] = useState<ProjectLayout | null>(null)
  const [infoRows, setInfoRows] = useState<InfoRow[]>([{ key: '', value: '' }])
  const [files, setFiles] = useState<LayoutFile[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const p = await getProject(projectId!)
        let towers = ''
        let height = ''
        let savedLayouts: ProjectLayout[] | null = null
        let savedRows: TypeRow[] | null = null
        let savedArea: string | null = null
        try {
          const s = await getSummary(projectId!)
          const d = s?.projectDetailsLayoutData
          if (d) {
            towers = d.noOfTowers || ''
            height = d.towerHeight || s?.projectLevelDesignData?.keyRatioInputs?.buildingHeight || ''
            if (d.totalArea) savedArea = d.totalArea
            if (d.layouts) savedLayouts = d.layouts
            if (d.tableRows) savedRows = d.tableRows
            const sa = s?.projectLevelDesignData?.keyRatioInputs?.saleableArea
            if (sa) setFallbackSaleable(parseFloat(sa) || null)
            setCustomFields(d.customFields ? [...d.customFields] : [])
            if (d.customFieldsImage) setSectionImage(d.customFieldsImage)
          }
        } catch (e) {
          console.error('Error fetching design brief summary for project details:', e)
        }
        const area = savedArea || (p.site_area_acres && parseFloat(p.site_area_acres) >= 0.5 ? p.site_area_acres : null) || p.site_area || ''
        setDetails({ name: p.name || '', projectType: p.projectType || '', category: p.category || '', location: p.location || '', totalArea: area, noOfTowers: towers, towerHeight: height })
        if (savedLayouts) {
          const hasMaster = savedLayouts.some((l) => l.name === 'Master Plan')
          setLayouts(hasMaster ? savedLayouts.map((l) => (l.name === 'Master Plan' ? { ...l, fixed: true } : l)) : [{ id: 0, name: 'Master Plan', files: [], fixed: true }, ...savedLayouts])
        }
        if (savedRows) setRows(savedRows)
      } catch (e) {
        console.error('Failed to fetch project data:', e)
        toast.error('Failed to load project details')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const save = async () => {
    setSaving(true)
    try {
      await updateProject(projectId!, {
        name: details.name,
        projectType: details.projectType as never,
        category: details.category as never,
        location: details.location,
        site_area: details.totalArea,
        site_area_acres: details.totalArea,
      })
      const grand = rows.reduce((s, r) => s + num(r.total), 0)
      await saveSummary(projectId!, {
        projectDetailsLayoutData: {
          noOfTowers: details.noOfTowers,
          towerHeight: details.towerHeight,
          totalArea: details.totalArea,
          layouts,
          tableRows: rows,
          customFields,
          customFieldsImage: sectionImage,
          grandTotalSaleable: grand || undefined,
        },
      })
      toast.success('Project Details & Layout saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving project details & layout:', e)
      toast.error(errorMessage(e, 'Failed to save project details'))
    } finally {
      setSaving(false)
    }
  }

  /* ---- custom fields / section image ---- */
  const setCustom = (i: number, k: keyof CustomField, v: string) => setCustomFields((cf) => cf.map((f, j) => (j === i ? { ...f, [k]: v } : f)))
  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingImage(true)
    try {
      const url = await uploadFile(f)
      if (url) {
        setSectionImage(url)
        toast.success('Image uploaded successfully!')
      } else toast.error('Failed to upload image')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (imageRef.current) imageRef.current.value = ''
    }
  }

  /* ---- type / unit table ---- */
  const setUnit = (ri: number, ui: number, k: 'type' | 'count' | 'size', v: string) => {
    const next = structuredClone(rows)
    const u = next[ri].units[ui]
    u[k] = v
    u.area = (parseFloat(u.count) || 0) * (parseFloat(u.size) || 0)
    next[ri].total = sumArea(next[ri])
    setRows(next)
  }
  const setRow = (ri: number, k: 'type' | 'typology', v: string) => {
    const next = [...rows]
    next[ri] = { ...next[ri], [k]: v }
    setRows(next)
  }
  const addUnit = (ri: number) => {
    const next = structuredClone(rows)
    next[ri].units.push(emptyUnit())
    next[ri].total = sumArea(next[ri])
    setRows(next)
  }
  const removeUnit = (ri: number, ui: number) => {
    const next = structuredClone(rows)
    if (next[ri].units.length > 1) {
      next[ri].units.splice(ui, 1)
      next[ri].total = sumArea(next[ri])
      setRows(next)
    }
  }

  /* ---- layouts (drag to reorder; Master Plan stays first) ---- */
  const onDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault()
    const from = dragFrom.current
    if (from === null || from === to) return setDragOver(null)
    const next = [...layouts]
    const [m] = next.splice(from, 1)
    next.splice(Math.max(1, to), 0, m)
    setLayouts(next)
    dragFrom.current = null
    setDragOver(null)
  }
  const addLayout = () => {
    if (!newLayout.trim()) return
    setLayouts([...layouts, { id: Date.now(), name: newLayout, files: [] }])
    setNewLayout('')
    setAdding(false)
  }
  const openManage = (l: ProjectLayout) => {
    setManaged(l)
    setFiles(l.files || [])
    setInfoRows(parseInfo(l.infoText || ''))
    setManageOpen(true)
  }
  const onLayoutFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingFile(true)
    try {
      const url = await uploadFile(f)
      if (url) {
        setFiles((fs) => [...fs, { id: Date.now() + Math.random(), name: f.name, url, size: (f.size / 1048576).toFixed(1) + ' MB', date: new Date().toISOString().split('T')[0] }])
        toast.success('File uploaded successfully!')
      } else toast.error('Failed to upload file to S3')
    } catch (err) {
      console.error('Error uploading file:', err)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }
  const saveManaged = () => {
    const infoText = joinInfo(infoRows)
    setLayouts((ls) => ls.map((l) => (l.id === managed!.id ? { ...l, files, infoText } : l)))
    setManageOpen(false)
    toast.success(`Layout files updated for ${managed!.name}`)
  }

  if (loading) return <PageLoader />

  const grand = rows.reduce((s, r) => s + num(r.total), 0)
  const shownTotal = grand > 0 ? grand : fallbackSaleable
  const categories = details.projectType === 'residential' ? CAT_RES : details.projectType === 'commercial' || details.projectType === 'retail' ? CAT_COM : [...CAT_RES, ...CAT_COM]

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-6">
      <div className="max-w-[1400px] mx-auto mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors mb-4">
          <ChevronLeft size={20} />
          <span>Project Details & Layout</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Project Details & Layout</h1>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-[#00509d] px-6 py-3">
              <h2 className="text-white font-semibold uppercase tracking-wider text-sm">Project Details</h2>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={LBL}>Project Name</label>
                <Input placeholder="Enter Project Name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className={FLD} />
              </div>
              <div className="space-y-2">
                <label className={LBL}>Project Type</label>
                <Select value={details.projectType} onValueChange={(v) => setDetails({ ...details, projectType: v })}>
                  <SelectTrigger className={FLD}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className={LBL}>Category</label>
                <Select value={details.category} onValueChange={(v) => setDetails({ ...details, category: v })}>
                  <SelectTrigger className={FLD}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className={LBL}>Location</label>
                <Input placeholder="Enter Location" value={details.location} onChange={(e) => setDetails({ ...details, location: e.target.value })} className={FLD} />
              </div>
              <div className="space-y-2">
                <label className={LBL}>Site Area (Acres)</label>
                <div className="relative">
                  <Input placeholder="Enter Site Area" value={details.totalArea} onChange={(e) => setDetails({ ...details, totalArea: e.target.value })} className={`${FLD} pr-16`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">acres</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className={LBL}>No. Of Towers</label>
                <Input placeholder="Enter Number" value={details.noOfTowers} onChange={(e) => setDetails({ ...details, noOfTowers: e.target.value })} className={FLD} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={LBL}>Building Height</label>
                <div className="relative">
                  <Input placeholder="Enter Building Height" value={details.towerHeight} onChange={(e) => setDetails({ ...details, towerHeight: e.target.value })} className={`${FLD} pr-12`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m</span>
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Additional / Custom Fields</label>
                {customFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Field Label" value={f.label} onChange={(e) => setCustom(i, 'label', e.target.value)} className={`${FLD} flex-1`} />
                    <Input placeholder="Value" value={f.value} onChange={(e) => setCustom(i, 'value', e.target.value)} className={`${FLD} flex-1`} />
                    <button
                      type="button"
                      onClick={() => setCustomFields((cf) => cf.filter((_, j) => j !== i))}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                      title="Remove field"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomFields((cf) => [...cf, { label: '', value: '', imageUrl: '' }])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:border-blue-300 rounded px-3 py-1.5 bg-blue-50/50 hover:bg-blue-50 transition-all flex items-center gap-1"
                >
                  <Plus size={12} />
                  Add Field
                </button>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Section Image (shown in PDF alongside the fields)</label>
                  <input type="file" accept="image/*" ref={imageRef} className="hidden" onChange={onImage} />
                  {sectionImage ? (
                    <div className="flex items-center gap-3">
                      <img src={sectionImage} alt="section" className="h-20 w-32 object-cover rounded border border-gray-200" />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => imageRef.current?.click()}
                          disabled={uploadingImage}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          {uploadingImage ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />}
                          Replace
                        </button>
                        <button type="button" onClick={() => setSectionImage('')} className="text-xs text-red-400 hover:text-red-600">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 rounded px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors w-full justify-center"
                    >
                      {uploadingImage ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                      Upload image for this page
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Type / unit table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#00509d] text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left border-r border-white/20">Type</th>
                    <th className="px-4 py-3 text-left border-r border-white/20">Typology</th>
                    <th className="px-4 py-3 text-left border-r border-white/20">Unit Type</th>
                    <th className="px-4 py-3 text-center border-r border-white/20">No. of Unit</th>
                    <th className="px-4 py-3 text-center border-r border-white/20 min-w-[140px]">Saleable Area in Sqft</th>
                    <th className="px-4 py-3 text-center border-r border-white/20">Total Area (sqft)</th>
                    <th className="px-4 py-3 text-center">Total (sqft)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <Fragment key={ri}>
                      {r.units.map((u, ui) => (
                        <tr key={`${ri}-${ui}`} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          {ui === 0 && (
                            <>
                              <td className="px-4 py-4 font-bold text-gray-800 border-r text-center align-middle" rowSpan={r.units.length}>
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Input value={r.type || ''} onChange={(e) => setRow(ri, 'type', e.target.value)} placeholder="Type Name" className="h-8 text-xs border-gray-200 text-center font-bold w-full" />
                                  <button
                                    type="button"
                                    onClick={() => addUnit(ri)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded px-1.5 py-0.5 bg-blue-50/50 transition-all flex items-center gap-1 font-semibold hover:shadow-sm"
                                  >
                                    <Plus size={10} />
                                    Add Unit
                                  </button>
                                  {rows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setRows((rs) => rs.filter((_, j) => j !== ri))}
                                      className="text-[10px] text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded px-1.5 py-0.5 bg-red-50/50 transition-all flex items-center gap-1 font-semibold hover:shadow-sm"
                                      title="Remove this type row"
                                    >
                                      <Trash2 size={10} />
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r bg-gray-50/50" rowSpan={r.units.length}>
                                <Input
                                  value={r.typology || ''}
                                  onChange={(e) => setRow(ri, 'typology', e.target.value)}
                                  placeholder="Typology"
                                  className="h-8 text-xs border-transparent focus:border-blue-300 bg-transparent font-medium text-gray-600"
                                />
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 border-r bg-gray-50/50">
                            <div className="flex items-center gap-1">
                              <Input
                                value={u.type || ''}
                                onChange={(e) => setUnit(ri, ui, 'type', e.target.value)}
                                placeholder="Unit Name"
                                className="h-8 text-xs border-transparent focus:border-blue-300 bg-transparent flex-1"
                              />
                              {r.units.length > 1 && (
                                <button type="button" onClick={() => removeUnit(ri, ui)} className="text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-50 rounded" title="Delete Unit Type">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <Input value={u.count || ''} onChange={(e) => setUnit(ri, ui, 'count', e.target.value)} className="h-8 text-xs border-gray-100 text-center" placeholder="0" />
                          </td>
                          <td className="px-4 py-3 border-r">
                            <Input value={u.size || ''} onChange={(e) => setUnit(ri, ui, 'size', e.target.value)} className="h-8 text-xs border-gray-100 text-center" placeholder="0" />
                          </td>
                          <td className="px-4 py-3 border-r text-center text-xs font-semibold text-gray-500">{num(u.area) > 0 ? num(u.area).toLocaleString('en-IN') : '-'}</td>
                          {ui === 0 && (
                            <td className="px-4 py-3 text-center text-sm font-bold text-[#009fe3]" rowSpan={r.units.length}>
                              {num(r.total) > 0 ? num(r.total).toLocaleString('en-IN') : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRows((rs) => [...rs, { type: '', typology: '', units: [emptyUnit()] }])}
                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded px-3 py-1.5 bg-blue-50/50 transition-all flex items-center gap-1.5 font-semibold hover:shadow-sm"
                >
                  <Plus size={12} />
                  Add Type
                </button>
              </div>
              {shownTotal && shownTotal > 0 ? (
                <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-medium">Total Saleable Area:</span>
                  <span className="text-sm font-bold text-[#009fe3]">{shownTotal.toLocaleString('en-IN')} sqft</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Project Layouts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden h-fit">
            <div className="bg-[#00509d] px-6 py-3">
              <h2 className="text-white font-semibold uppercase tracking-wider text-sm">Project Layouts</h2>
              <p className="text-[10px] text-blue-200 mt-1">Please upload the following layouts in PDF formats</p>
            </div>
            <div className="p-6 space-y-2">
              {layouts.map((l, i) => (
                <div
                  key={l.id}
                  draggable={!l.fixed}
                  onDragStart={
                    l.fixed
                      ? undefined
                      : (e) => {
                          dragFrom.current = i
                          e.dataTransfer.effectAllowed = 'move'
                        }
                  }
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOver(i)
                  }}
                  onDrop={(e) => onDrop(e, i)}
                  onDragEnd={() => {
                    dragFrom.current = null
                    setDragOver(null)
                  }}
                  className={[
                    'flex items-center justify-between p-3 border rounded-lg transition-all group',
                    dragOver === i && !l.fixed ? 'bg-blue-50 border-blue-300 border-dashed' : 'bg-gray-50 hover:bg-white',
                    l.fixed ? '' : 'cursor-grab active:cursor-grabbing',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    {!l.fixed && <GripVertical size={15} className="text-gray-300 group-hover:text-gray-400 shrink-0 cursor-grab" />}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-700">{l.name}</span>
                      <span className="text-[10px] text-green-600 font-medium">
                        {l.files && l.files.length > 0 ? `${l.files.length} File${l.files.length > 1 ? 's' : ''} Uploaded` : 'No Files Uploaded'}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openManage(l)} className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 h-8 px-3 shrink-0">
                    {l.files && l.files.length > 0 && <CircleCheck size={14} className="text-green-500" />}
                    Manage
                  </Button>
                </div>
              ))}
              {adding ? (
                <div className="p-4 border-2 border-dashed border-green-200 rounded-lg bg-green-50/30 space-y-3">
                  <Input autoFocus placeholder="Layout Name" value={newLayout} onChange={(e) => setNewLayout(e.target.value)} className="h-9 border-green-100" />
                  <div className="flex gap-2">
                    <Button onClick={addLayout} className="flex-1 bg-green-500 hover:bg-green-600 text-white h-8 text-xs font-bold">
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setNewLayout('')
                      }}
                      className="flex-1 h-8 text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setAdding(true)} className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white rounded-lg py-6 gap-2 font-bold shadow-sm">
                  <Plus size={18} />
                  Add Layout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manage Layout Files modal */}
      {manageOpen && managed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#00509d] px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Manage Layout Files</h3>
                <p className="text-blue-100 text-xs">{managed.name}</p>
              </div>
              <button onClick={() => setManageOpen(false)} className="text-white hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Uploaded Files</h4>
                <div className="space-y-3">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <FileText className="text-red-500" size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{f.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {f.size} • Uploaded on {f.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => f.url && window.open(f.url, '_blank')} variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 h-8 px-2">
                          Download
                        </Button>
                        <Button onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))} variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 h-8 px-2">
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {files.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No files uploaded yet.</p>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Info Box</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Shown as overlay text on the PDF slide</p>
                  </div>
                  <button
                    onClick={() => setInfoRows((r) => [...r, { key: '', value: '' }])}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#00509d] hover:bg-[#003d7a] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-[1fr_1fr_44px] bg-gray-50 border-b border-gray-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Label</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Value</span>
                    <span />
                  </div>
                  {infoRows.map((r, i) => (
                    <div key={i} className={`grid grid-cols-[1fr_1fr_44px] items-center px-3 py-2.5 gap-2 border-b border-gray-50 last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      {(['key', 'value'] as const).map((k) => (
                        <Input
                          key={k}
                          value={r[k]}
                          onChange={(e) => setInfoRows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                          placeholder={k === 'key' ? 'Label' : 'Value'}
                          className="h-8 text-xs border-gray-200 bg-white shadow-none focus:ring-1 focus:ring-blue-300 rounded-lg"
                        />
                      ))}
                      <button
                        onClick={() => setInfoRows((rs) => (rs.length === 1 ? [{ key: '', value: '' }] : rs.filter((_, j) => j !== i)))}
                        className="w-8 h-8 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {infoRows.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">No rows yet. Click "Add Row" to begin.</p>}
                </div>
              </div>
              <div
                onClick={() => !uploadingFile && fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors group"
              >
                <input type="file" ref={fileRef} className="hidden" onChange={onLayoutFile} disabled={uploadingFile} />
                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                  {uploadingFile ? <LoaderCircle className="text-blue-500 animate-spin" size={28} /> : <Upload className="text-blue-500" size={28} />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800">{uploadingFile ? 'Uploading file...' : 'Drop files here'}</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse from your computer</p>
                </div>
                <Button className="bg-green-500 hover:bg-green-600 text-white font-bold h-9 px-6 rounded-full border-none" disabled={uploadingFile}>
                  Browse Files
                </Button>
                <p className="text-[10px] text-gray-300">Max file size: 50MB • Supported formats: PDF, DWG</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setManageOpen(false)} className="h-10 px-6 font-bold text-gray-500">
                Cancel
              </Button>
              <Button onClick={saveManaged} className="bg-green-500 hover:bg-green-600 text-white h-10 px-8 font-bold shadow-md">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto mt-12 flex justify-end gap-4 pb-12">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={saving} className="border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-6 rounded-lg font-bold">
          <X size={18} className="mr-2" />
          Cancel
        </Button>
        <Button onClick={save} disabled={saving} className="bg-[#00509d] hover:bg-[#003f7a] text-white px-10 py-6 rounded-lg font-bold shadow-md gap-2 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
    </div>
  )
}
