import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleCheck, FileText, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageLoader from '@/components/common/PageLoader'
import { ListCard, ListPageHeader, SubmitFooter, greenAddBtn, thCls } from '@/components/design-chapters-b/PageChrome'
import { errorMessage, saveSummary, uploadFile, useSummaryLoader } from '@/api/chapters-b'
import type { AdditionalDetail, DetailFile } from '@/types/chapters-b'

const DEFAULT_DETAILS: AdditionalDetail[] = [
  {
    id: 1,
    subject: 'Logistics Plan',
    description: 'Comprehensive site logistics including entry/exit points, material storage, and labor movement flow.',
    files: ['logistics_v1.pdf'],
  },
  {
    id: 2,
    subject: 'Key Details',
    description: 'Summary of critical project parameters including site constraints and special architectural requirements.',
    files: ['project_summary.docx'],
  },
]

const fileName = (f: DetailFile) => (typeof f === 'object' && f !== null ? f.name : f)
const fileUrl = (f: DetailFile) => (typeof f === 'object' && f !== null ? f.url : null)

export default function AdditionalProjectDetailsForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<AdditionalDetail[]>(DEFAULT_DETAILS)

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      if (s?.additionalProjectDetailsData && s.additionalProjectDetailsData.length > 0) setRows(s.additionalProjectDetailsData)
    },
    { delay: 500, label: 'additional project details' },
  )

  const update = <K extends keyof AdditionalDetail>(id: number, key: K, value: AdditionalDetail[K]) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: value } : x)))

  const removeFile = (id: number, file: DetailFile) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, files: x.files.filter((f) => fileName(f) !== fileName(file)) } : x)))

  const onUpload = async (row: AdditionalDetail, file: File | undefined) => {
    if (!file) return
    const tid = toast.loading('Uploading file to S3...')
    try {
      const url = await uploadFile(file)
      if (url) {
        update(row.id, 'files', [...row.files, { name: file.name, url }])
        toast.success('File uploaded successfully!', { id: tid })
      } else toast.error('Failed to upload file to S3', { id: tid })
    } catch (e) {
      console.error('Error uploading file:', e)
      toast.error('Failed to upload file', { id: tid })
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { additionalProjectDetailsData: rows })
      toast.success('Additional Project Details saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving additional project details:', e)
      toast.error(errorMessage(e, 'Failed to save data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <ListPageHeader title="Additional Project Details" subtitle="Capture miscellaneous project information and supporting documents" />
      <ListCard
        icon={<FileText size={18} />}
        title="Additional Project Details"
        action={
          <Button type="button" onClick={() => setRows([...rows, { id: Date.now() + Math.random(), subject: '', description: '', files: [] }])} className={greenAddBtn}>
            <Plus size={16} /> Add Details
          </Button>
        }
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#00509d] text-white">
              <th className={`${thCls} w-16 text-center`}>S.No</th>
              <th className={`${thCls} w-[25%]`}>Subject</th>
              <th className={`${thCls} w-[40%]`}>Description</th>
              <th className={`${thCls} w-[20%]`}>Upload</th>
              <th className={`${thCls} w-12 text-center`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors align-top">
                <td className="px-6 py-5 text-[12px] font-medium text-gray-400 text-center">{i + 1}</td>
                <td className="px-4 py-4">
                  <Input
                    value={s.subject}
                    onChange={(e) => update(s.id, 'subject', e.target.value)}
                    className="h-10 text-[12px] bg-white border-gray-100 focus:bg-white rounded-xl font-bold text-gray-700"
                    placeholder="Enter Subject (e.g. Site Plan)"
                  />
                </td>
                <td className="px-4 py-4">
                  <textarea
                    value={s.description}
                    onChange={(e) => update(s.id, 'description', e.target.value)}
                    className="w-full min-h-[80px] text-[12px] bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-xl resize-none py-3 px-3 transition-all"
                    placeholder="Enter detailed description..."
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      id={`file-upload-${s.id}`}
                      className="hidden"
                      onChange={(e) => {
                        onUpload(s, e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`file-upload-${s.id}`)?.click()}
                      className="h-10 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 hover:bg-white hover:border-[#00509d]/30 hover:text-[#00509d] transition-all group"
                    >
                      <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                      Upload File
                    </button>
                    {s.files.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        {s.files.map((f, idx) => {
                          const name = fileName(f)
                          const url = fileUrl(f)
                          return (
                            <div key={idx} className="flex items-center gap-2 bg-green-50/50 px-3 py-1.5 rounded-lg border border-green-100/50 group animate-fadeIn">
                              <CircleCheck size={12} className="text-green-600" />
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-700 hover:underline truncate max-w-[150px]">
                                  {name}
                                </a>
                              ) : (
                                <span className="text-[10px] font-bold text-green-700 truncate max-w-[150px]">{name}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(s.id, f)}
                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-5 text-center">
                  <button type="button" onClick={() => setRows(rows.filter((x) => x.id !== s.id))} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>
      <SubmitFooter saving={saving} onSubmit={submit} />
    </div>
  )
}
