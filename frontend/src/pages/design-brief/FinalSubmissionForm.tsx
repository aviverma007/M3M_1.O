/* Final Submission to MO — /design-brief/final-submission (original: FinalSubmissionForm-C9Ht0FKA) */
import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { CircleCheck, CloudUpload, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { http } from '@/api/http'
import { Button } from '@/components/ui/button'
import FileLink from '@/components/design-brief/FileLink'
import type { DesignBriefOutletContext } from '@/types/design-brief'

type DocType = 'inHouseDocUrl' | 'moApprovedDocUrl'

type StepProps = {
  label: string
  inputId: string
  existingUrl?: string | null
  file: File | null
  onFile: (f: File) => void
  onDelete: () => void
  updateText: string
}

function UploadStep({ label, inputId, existingUrl, file, onFile, onDelete, updateText }: StepProps) {
  const ref = useRef<HTMLInputElement>(null)
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onFile(e.target.files[0])
  }
  return (
    <div className="space-y-3">
      <label className="text-sm font-black text-gray-900 uppercase tracking-wider block">
        {label} {!existingUrl && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`border-2 border-dashed rounded-[24px] p-16 flex flex-col items-center justify-center transition-all cursor-pointer relative group ${existingUrl ? 'border-green-100 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50'}`}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" id={inputId} className="hidden" accept=".pdf,.doc,.docx" onChange={pick} />
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform shadow-sm bg-white">
          <CloudUpload className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-black text-blue-600 mb-1 tracking-tight">{existingUrl ? updateText : 'Click to upload or drag and drop'}</p>
        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{existingUrl ? 'A document is already uploaded' : 'PDF, DOC, DOCX (max. 10MB)'}</p>
        {file && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center rounded-[24px] border-2 border-green-500 shadow-xl text-green-700 gap-3 z-20">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
              <CircleCheck className="w-6 h-6" strokeWidth={3} />
            </div>
            <span className="font-black text-lg">{file.name}</span>
          </div>
        )}
        {existingUrl && !file && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
            <FileLink
              href={existingUrl}
              mode="view"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
            >
              <Eye size={12} />
              View
            </FileLink>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 size={12} />
              Delete
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ml-2">
              <CircleCheck size={12} />
              Uploaded
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FinalSubmissionForm() {
  const ctx = useOutletContext<DesignBriefOutletContext | undefined>()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [inHouse, setInHouse] = useState<File | null>(null)
  const [moDoc, setMoDoc] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const deleteDoc = async (docType: DocType) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return
    try {
      await http.delete(`/project/${projectId}/design-brief-summary/document`, { data: { docType } })
      toast.success('Document deleted successfully')
      ctx?.refreshData()
    } catch (e) {
      console.error('Error deleting document:', e)
      toast.error('Failed to delete document')
    }
  }

  const submit = async () => {
    if (!inHouse && !moDoc) {
      alert('Please upload at least one document.')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      if (inHouse) fd.append('inHouseDoc', inHouse)
      if (moDoc) fd.append('moApprovedDoc', moDoc)
      fd.append('sentToDesignTeam', 'true')
      fd.append('sentAt', new Date().toISOString())
      await http.post(`/project/${projectId}/design-brief-summary`, fd)
      alert('Final Documents submitted successfully!')
      navigate('/dashboard')
    } catch (e) {
      console.error('Error submitting final documents:', e)
      alert('Failed to submit final documents. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const summary = ctx?.dashboardData?.summary
  return (
    <div className="space-y-12">
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Final Submission to MO</h3>
          <p className="text-sm text-gray-400 mt-1 font-semibold tracking-tight">Complete steps below to submit for MO approval</p>
        </div>
        <div className="space-y-8">
          <UploadStep
            label="Step 1: In House Design Document"
            inputId="inhouse-upload"
            existingUrl={summary?.inHouseDocUrl}
            file={inHouse}
            onFile={setInHouse}
            onDelete={() => deleteDoc('inHouseDocUrl')}
            updateText="Update In House Document"
          />
          <UploadStep
            label="Step 2: Upload MO Approved Design Brief"
            inputId="mo-upload"
            existingUrl={summary?.moApprovedDocUrl}
            file={moDoc}
            onFile={setMoDoc}
            onDelete={() => deleteDoc('moApprovedDocUrl')}
            updateText="Update MO Document"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-gray-100 mt-10">
          <div className="flex items-center gap-4 text-gray-400">
            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black">i</span>
            </div>
            <p className="text-sm font-bold tracking-tight">At least one document is required for final submission</p>
          </div>
          <Button
            className="w-full sm:w-auto px-12 h-14 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-base rounded-[18px] shadow-xl shadow-green-100 transition-all transform active:scale-[0.98] uppercase tracking-widest"
            onClick={submit}
            disabled={submitting || (!inHouse && !moDoc)}
          >
            {submitting ? 'Submitting...' : 'Submit to MO'}
          </Button>
        </div>
      </div>
    </div>
  )
}
