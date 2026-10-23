/**
 * Department input form shared by Liaison / Business Development / Land / Structure / MEP
 * (originals: LiaisonForm, BusinessDevelopmentForm, LandForm, StructureForm, MEPForm — same logic, per-form styling).
 */
import { useEffect, useState, type ChangeEvent } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { CircleCheck, Download, FileText, PenLine, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createDeptRecord, downloadPdf, getAssignees, getDeptRecords, updateDeptRecord, uploadFile } from '@/api/design-brief'
import PageLoader from '@/components/common/PageLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/overlays'
import type { BriefUser, DesignBriefOutletContext, DeptPath, DeptRecord } from '@/types/design-brief'
import AssignDialog, { EMPTY_ASSIGN, type AssignForm } from './AssignDialog'
import FileLink from './FileLink'
import type { BriefField } from './fields'
import ReviewComments from './ReviewComments'
import { SUPER_ADMIN_ROLES } from './utils'

export type DepartmentFormConfig = {
  path: DeptPath
  title: string
  /** name used in console messages ("Error saving Business Development:") */
  logName?: string
  fields: BriefField[]
  /** Liaison has its own (rounded-xl) look; the others share the "standard" look */
  look: 'liaison' | 'standard'
  /** Land: CAD + PDF attachment per item, plus the Encroachments yes/no item */
  cadPdf?: boolean
  rootClassName?: string
  formClassName?: string
  /** Structure & MEP draw a top border on custom-field attachment rows */
  customNoteBorder?: boolean
  /** Liaison & BD render an empty spacer between "Add Custom Field" and Submit */
  spacer?: boolean
}

type Values = Record<string, string | null>

const COMMENT_VIEW_ROLES = [
  ...SUPER_ADMIN_ROLES,
  'general_admin',
  'general admin',
  'general_contributor',
  'design_admin',
  'design admin',
  'design_contributor',
  'design contributor',
]
const COMMENT_POST_ROLES = [...SUPER_ADMIN_ROLES, 'general_admin', 'general admin', 'design_admin', 'design admin']

const UploadSvg = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

export default function DepartmentForm({ config }: { config: DepartmentFormConfig }) {
  const { path, title, fields, look, cadPdf = false } = config
  const logName = config.logName ?? title
  const { projectId } = useParams()
  const ctx = useOutletContext<DesignBriefOutletContext | undefined>()
  const [searchParams] = useSearchParams()
  const isReview = searchParams.get('mode') === 'review'
  const activeUser = ctx?.activeUser ?? null

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<number | null>(null)
  const [record, setRecord] = useState<DeptRecord | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigneeName, setAssigneeName] = useState<string | null>(null)
  const [assign, setAssign] = useState<AssignForm>(EMPTY_ASSIGN)
  const [members, setMembers] = useState<BriefUser[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customKeys, setCustomKeys] = useState<string[]>([])
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {}
    fields.forEach((f) => {
      v[f.name] = ''
      v[`${f.name}Note`] = null
      if (cadPdf) {
        v[`${f.name}CADNote`] = null
        v[`${f.name}PDFNote`] = null
      }
    })
    if (cadPdf) Object.assign(v, { encroachments: 'No', encroachmentsCADNote: null, encroachmentsPDFNote: null })
    return v
  })
  const [custom, setCustom] = useState<Values>({})

  const role = activeUser?.role?.toLowerCase() ?? ''
  const isSuper = SUPER_ADMIN_ROLES.includes(role)
  const userDept = activeUser?.department?.toLowerCase()
  /** design team members only review (read only) */
  const isDesign = ['design_admin', 'design_contributor'].includes(role) && (!userDept || userDept === 'design')
  const isContributor = role === 'general_contributor' || (['general_admin', 'general admin'].includes(role) && record?.assignedTo === activeUser?.id)
  const readOnlyFiles = isSuper || isDesign
  const inputDisabled = isDesign || isReview

  const setValue = (k: string, v: string | null) => setValues((s) => ({ ...s, [k]: v }))
  const setCustomValue = (k: string, v: string | null) => setCustom((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (isSuper) return
    getAssignees(path)
      .then(setMembers)
      .catch((e) => console.error('Error fetching team members:', e))
  }, [isSuper, path])

  useEffect(() => {
    ;(async () => {
      try {
        const rows = await getDeptRecords(path, projectId!)
        if (rows.length > 0) {
          const r = rows[0]
          setRecordId(r.id)
          setRecord(r)
          ctx?.setAssignmentData(r)
          setValues((s) => {
            const next = { ...s }
            Object.keys(next).forEach((k) => {
              const v = r[k] as string | null | undefined
              next[k] = k.endsWith('Note') ? v || null : k === 'encroachments' ? v || 'No' : v || ''
            })
            return next
          })
          if (r.assignedTo) setAssign((a) => ({ ...a, memberId: String(r.assignedTo), dueDate: r.deadline ? r.deadline.split('T')[0] : '' }))
          if (r.Assignee?.name) setAssigneeName(r.Assignee.name)
          if (r.customFields) {
            setCustomKeys(Object.keys(r.customFields).filter((k) => !k.endsWith('Note')))
            setCustom(Object.fromEntries(Object.entries(r.customFields).map(([k, v]) => [k, v || ''])))
          }
        }
      } catch (e) {
        console.error(`Error fetching ${logName} data:`, e)
        toast.error('Failed to fetch data.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, path])

  useEffect(() => {
    if (assign.memberId && members.length > 0) {
      const m = members.find((x) => x.id.toString() === assign.memberId)
      if (m) setAssigneeName(m.name)
    }
  }, [assign.memberId, members])

  /** upload a file and store its URL in `<key>Note` (keys ending in Note are used as is) */
  const onUpload = async (e: ChangeEvent<HTMLInputElement>, key: string, isCustom = false) => {
    const file = e.target.files?.[0]
    if (!file) return
    const target = key.endsWith('Note') ? key : `${key}Note`
    setUploadingKey(isCustom ? `customFields.${key}` : key)
    try {
      const url = await uploadFile(file)
      if (url) {
        if (isCustom) setCustomValue(target, url)
        else setValue(target, url)
        toast.success('File uploaded successfully!')
      } else toast.error('Failed to get upload URL.')
    } catch (err) {
      console.error('Error uploading file:', err)
      toast.error('Failed to upload file.')
    } finally {
      setUploadingKey(null)
    }
  }

  const save = async (submit = false, approve = false, reject = false) => {
    setSaving(true)
    try {
      let status: string | undefined = recordId ? undefined : 'In Progress'
      if (submit) status = 'Submitted'
      if (approve) status = 'Approved'
      if (reject) status = 'Rejected'
      const customFields: Values = {}
      customKeys.forEach((k) => {
        if (custom[k] !== undefined) customFields[k] = custom[k]
        if (custom[`${k}Note`] !== undefined) customFields[`${k}Note`] = custom[`${k}Note`]
      })
      const body = {
        ...values,
        projectId: parseInt(projectId!),
        assignedTo: assign.memberId ? parseInt(assign.memberId) : null,
        deadline: assign.dueDate ? new Date(assign.dueDate).toISOString() : null,
        status,
        receivedDate: submit ? new Date().toISOString() : undefined,
        customFields,
      }
      if (recordId) {
        const r = await updateDeptRecord(path, recordId, body)
        if (r) setRecord(r)
      } else {
        const r = await createDeptRecord(path, body)
        if (r?.id) {
          setRecordId(r.id)
          setRecord(r)
        }
      }
      ctx?.refreshData()
      if (submit) toast.success('Task submitted successfully!')
      else if (approve) toast.success('Task approved successfully!')
      else if (reject) toast.success('Task rejected and sent back for revision.')
      else toast.success('Progress saved successfully!')
    } catch (e) {
      console.error(`Error saving ${logName}:`, e)
      toast.error((e as Error).message || 'Failed to save data.')
    } finally {
      setSaving(false)
    }
  }

  const addCustomField = () => {
    const label = customLabel.trim()
    if (!label) {
      toast.error('Please enter a field label')
      return
    }
    if (customKeys.includes(label)) {
      toast.error('Field already exists')
      return
    }
    setCustomKeys([...customKeys, label])
    setCustomValue(label, '')
    setCustomLabel('')
    setCustomOpen(false)
    toast.success(`Field "${customLabel}" added`)
  }

  const downloadInputs = async () => {
    if (!recordId) {
      toast.error('No record found to download.')
      return
    }
    try {
      await downloadPdf(`/${path}/${recordId}/download-design-brief-inputs`, `${path}-design-brief-${recordId}.pdf`)
      toast.success('PDF Downloaded successfully!')
    } catch (e) {
      console.error('Error downloading PDF:', e)
      toast.error('Failed to download PDF.')
    }
  }

  const onAssign = async () => {
    if (!assign.memberId) {
      toast.error('Please select a team member')
      return
    }
    await save()
    const m = members.find((x) => x.id.toString() === assign.memberId)
    setAssigneeName(m ? m.name : 'Unknown')
    setAssignOpen(false)
    toast.success('Task assigned successfully')
  }

  if (loading) return <PageLoader />

  const L = look === 'liaison'
  const cls = {
    label: L ? 'text-sm font-bold text-gray-700' : 'text-sm font-medium text-gray-700',
    box: L
      ? 'border border-gray-200 rounded-xl bg-white shadow-sm hover:border-blue-400 transition-all overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 group'
      : 'border rounded-lg bg-white shadow-sm hover:border-green-400 transition-colors overflow-hidden',
    input: L
      ? 'border-0 shadow-none focus-visible:ring-0 rounded-b-none border-b border-dashed border-gray-100 h-11 text-sm font-medium disabled:bg-transparent disabled:opacity-100'
      : 'border-0 shadow-none focus-visible:ring-0 rounded-b-none border-b border-dashed h-10 disabled:bg-transparent disabled:opacity-100',
    customInput: L
      ? 'border-0 shadow-none focus-visible:ring-0 rounded-b-none border-b border-dashed border-gray-100 h-11 text-sm font-medium disabled:bg-transparent disabled:opacity-100'
      : 'border-0 shadow-none focus-visible:ring-0 rounded-b-none border-b border-dashed h-10 disabled:bg-transparent disabled:opacity-100 font-medium text-gray-900',
    note: L
      ? 'h-10 flex items-center justify-between px-3 bg-[#f8fafc]/50 relative transition-colors group-hover:bg-blue-50/30'
      : 'h-9 flex items-center justify-between px-3 bg-gray-50/50 relative group',
  }
  const customNoteCls = config.customNoteBorder ? `${cls.note} border-t border-gray-100` : cls.note

  /** attachment row for `<base>Note` */
  const renderNote = (value: string | null, onClear: () => void, uploadKey: string, onChange: (e: ChangeEvent<HTMLInputElement>) => void, className: string) => (
    <div className={className}>
      {value ? (
        <>
          <div className={L ? 'flex items-center gap-2 text-xs font-semibold text-blue-600 truncate' : 'flex items-center gap-2 text-sm text-gray-600 truncate'}>
            <FileText className={L ? 'w-4 h-4 flex-shrink-0' : 'w-4 h-4 text-gray-400 flex-shrink-0'} />
            <span className="truncate">{decodeURIComponent(value.split('/').pop() || '') || 'Uploaded File'}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileLink href={value} mode="view" className="p-1 hover:bg-blue-50 rounded" title="View file">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </FileLink>
            <FileLink href={value} mode="download" className="p-1 hover:bg-blue-50 rounded" title="Download file">
              <Download className="w-3.5 h-3.5 text-blue-500" />
            </FileLink>
            {!isSuper && !isDesign && (
              <button type="button" onClick={onClear} className="p-1 hover:bg-red-50 rounded">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
              </button>
            )}
          </div>
        </>
      ) : readOnlyFiles ? (
        L ? (
          <div className="w-full h-full flex items-center gap-2 text-xs font-semibold text-gray-400">
            <FileText className="w-3.5 h-3.5 text-gray-300" />
            <span className="italic">No file attached</span>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-300" />
              <span className="italic">No file attached</span>
            </div>
          </div>
        )
      ) : L ? (
        <div className="w-full h-full flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer group">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-100 group-hover:bg-blue-100 transition-colors">
            <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-600" />
          </div>
          <span className="group-hover:text-blue-600 transition-colors uppercase tracking-tight">{uploadingKey === uploadKey ? 'Uploading...' : 'Upload File'}</span>
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onChange} />
        </div>
      ) : (
        <div className="w-full flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <UploadSvg />
          <span>{uploadingKey === uploadKey ? 'Uploading...' : 'Upload file'}</span>
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onChange} />
        </div>
      )}
    </div>
  )

  /** Land: CAD / PDF pair for `<base>` */
  const renderCadPdf = (base: string) => (
    <div className="grid grid-cols-2 divide-x border-t border-dashed">
      {(['CAD', 'PDF'] as const).map((t) => {
        const key = `${base}${t}Note`
        const value = values[key]
        return (
          <div key={t} className="h-9 flex items-center justify-between px-3 bg-gray-50/50 relative group">
            {value ? (
              <>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 truncate">
                  <span className="font-bold text-blue-600">{t}:</span>
                  <span className="truncate">{decodeURIComponent(value.split('/').pop() || '') || 'File'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileLink href={value} mode="view" className="p-1 hover:bg-blue-50 rounded">
                    <FileText className="w-3 h-3 text-blue-500" />
                  </FileLink>
                  {!isSuper && !isDesign && (
                    <button type="button" onClick={() => setValue(key, null)} className="p-1 hover:bg-red-50 rounded">
                      <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </>
            ) : readOnlyFiles ? (
              <div className="w-full flex items-center gap-1 text-[10px] text-gray-400 italic">
                <span className="font-bold">{t}:</span> No file
              </div>
            ) : (
              <div className="w-full flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                <Plus className="w-3 h-3" />
                <span>{uploadingKey === key ? '...' : `Upload ${t}`}</span>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept={t === 'CAD' ? '.dwg,.dxf' : '.pdf'}
                  onChange={(e) => onUpload(e, key)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const downloadBtn = (asContributor: boolean) => (
    <Button
      {...(asContributor ? { type: 'button' as const } : {})}
      variant="outline"
      onClick={downloadInputs}
      className="text-[#00509d] border-[#00509d] hover:bg-blue-50 gap-2 font-bold px-4"
    >
      <Download className="w-4 h-4" />
      Download Inputs
    </Button>
  )

  return (
    <div className={config.rootClassName ?? 'space-y-6 pb-20'}>
      {isContributor ? (
        <div className="pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-1 font-bold">Please provide the Inputs below</p>
          </div>
          {downloadBtn(true)}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{fields.length} items • Edit fields below to update department inputs</p>
            </div>
            {isReview && record?.Assignee && (
              <div className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm">Submitted By: {record.Assignee.name}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isSuper && assigneeName && !isReview && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Assigned to: <strong>{assigneeName}</strong>
                </span>
                {['super_admin', 'design_admin'].includes(role) && (
                  <button
                    className="text-blue-500 hover:text-blue-700 text-xs border border-blue-200 rounded px-2 py-0.5 bg-blue-50"
                    onClick={() => setAssignOpen(true)}
                  >
                    Change
                  </button>
                )}
              </div>
            )}
            {downloadBtn(false)}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save(true)
        }}
        className={config.formClassName ?? 'space-y-10'}
      >
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${L ? 'gap-8' : 'gap-6'}`}>
          {fields.map((f) => (
            <div key={f.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={cls.label}>{f.label}</label>
                {isSuper && <PenLine className="w-4 h-4 text-gray-400 cursor-pointer hover:text-blue-500" />}
              </div>
              <div className={cls.box}>
                <Input
                  name={f.name}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  placeholder={L ? 'Enter text...' : 'Text'}
                  disabled={inputDisabled}
                  className={cls.input}
                />
                {cadPdf
                  ? renderCadPdf(f.name)
                  : renderNote(values[`${f.name}Note`], () => setValue(`${f.name}Note`, null), f.name, (e) => onUpload(e, f.name), cls.note)}
              </div>
            </div>
          ))}

          {cadPdf && (
            <div className="space-y-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Encroachments</label>
              </div>
              <div className={cls.box}>
                <div className="px-3 h-10 flex items-center gap-4">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`enc-${opt.toLowerCase()}`}
                        name="encroachments"
                        value={opt}
                        checked={values.encroachments === opt}
                        onChange={() => setValue('encroachments', opt)}
                        disabled={inputDisabled}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`enc-${opt.toLowerCase()}`} className="text-sm">
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
                {values.encroachments === 'Yes' && renderCadPdf('encroachments')}
              </div>
            </div>
          )}

          {customKeys.map((k) => (
            <div key={k} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">{k}</label>
                {!isDesign && (
                  <button type="button" onClick={() => setCustomKeys(customKeys.filter((x) => x !== k))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className={cls.box}>
                <Input
                  value={custom[k] ?? ''}
                  onChange={(e) => setCustomValue(k, e.target.value)}
                  placeholder="Enter value"
                  disabled={inputDisabled}
                  className={cls.customInput}
                />
                {renderNote(custom[`${k}Note`] ?? null, () => setCustomValue(`${k}Note`, null), `customFields.${k}`, (e) => onUpload(e, k, true), customNoteCls)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
          {!isDesign && !isReview && (
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="flex items-center gap-3 px-6 py-3 border-2 border-dashed border-green-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all text-green-700 font-bold text-sm"
            >
              {L ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  Add Custom Field
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-green-400 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-green-600">Add Custom Field</span>
                </>
              )}
            </button>
          )}
          {config.spacer && <div />}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isReview && ctx?.canApprove ? (
              <div className="flex items-center gap-3 w-full">
                <Button type="button" onClick={() => save(false, false, true)} className="flex-1 h-11 px-8 rounded-md font-bold text-white bg-red-500 hover:bg-red-600 gap-2 shadow-sm">
                  <X className="w-4 h-4" /> Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => save(false, true, false)}
                  className="flex-1 h-11 px-8 rounded-md font-bold text-white bg-[#22c55e] hover:bg-[#16a34a] gap-2 shadow-sm"
                >
                  <CircleCheck className="w-4 h-4" /> Approve and Submit to MO
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => save(true)}
                disabled={saving || isDesign}
                className={`flex-1 sm:flex-none h-11 px-10 rounded-xl font-bold text-white gap-2 transition-all transform active:scale-95 bg-[#22c55e] hover:bg-[#16a34a] shadow-lg shadow-green-100 ${isDesign ? 'hidden' : ''}`}
              >
                <CircleCheck className="w-4 h-4" />
                {saving ? 'Processing...' : 'Submit'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Field Label <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Additional Comments"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={addCustomField}>
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewComments
        projectId={projectId}
        department={path}
        activeUser={activeUser}
        title="Department Comments"
        commentType="all"
        viewRoles={COMMENT_VIEW_ROLES}
        postRoles={COMMENT_POST_ROLES}
      />

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} form={assign} onChange={setAssign} members={members} onAssign={onAssign} />
    </div>
  )
}

