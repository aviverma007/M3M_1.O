/* Side cards / banners used by DesignBriefLayout (original DesignBriefLayout chunk: ze, He, Ge, Ue). */
import { useState } from 'react'
import { ArrowUpRight, CircleCheck, Clock, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { downloadPdf } from '@/api/design-brief'
import type { BriefComment } from '@/types/design-brief'
import type { Project } from '@/types'
import { roleLabel, timeAgoShort } from './utils'

/** Header shown to a general contributor instead of the project header. */
export function ContributorBanner({ activeDeptLabel, projectId }: { activeDeptLabel: string; projectId?: string }) {
  const [downloading, setDownloading] = useState(false)
  const download = async () => {
    if (!projectId) {
      toast.error('Project ID is missing.')
      return
    }
    setDownloading(true)
    try {
      await downloadPdf(`/project/${projectId}/design-brief/download`, `Design_Brief_${projectId}.pdf`)
      toast.success('Design Brief downloaded successfully!')
    } catch (e) {
      console.error('Error downloading PDF:', e)
      toast.error('Failed to download Design Brief.')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <div className="space-y-0 -mx-4">
      <div className="px-4 py-6 space-y-6 bg-[#f8fafc]">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Uploaded In-house Design Document</h3>
          <div className="flex items-center justify-between p-4 bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl group hover:border-blue-400 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer" onClick={download}>
                  M3M_Crown_Design_Brief_v2.3.pdf
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  PDF <span className="text-gray-300">•</span> 2.34 MB <span className="text-gray-300">•</span>
                  <span className="text-green-600 font-bold flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded">
                    <CircleCheck className="w-3 h-3" /> Uploaded
                  </span>
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00509d] hover:bg-[#003d73] text-white text-sm font-bold rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
              onClick={download}
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>
        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>Dashboards</span>
            <span>/</span>
            <span>My Tasks</span>
            <span>/</span>
            <span className="text-blue-500 font-medium">{activeDeptLabel}</span>
          </div>
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl font-black text-gray-900">M3M Crown - Residential Property</h1>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-100 rounded tracking-tight">{activeDeptLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const Label = ({ children }: { children: string }) => (
  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">{children}</p>
)

export function FinalProjectCard({ project, lastModified }: { project: Project | null; lastModified: string | null }) {
  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-')
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 leading-tight">{project?.name || 'M3M Project'}</h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tight">{project?.location || 'Gurugram, India'}</p>
        </div>
        {project?.projectType && (
          <div className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-tighter">{project.projectType}</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-y-5 pt-2">
        <div className="space-y-1">
          <Label>Project Owner</Label>
          <p className="text-sm font-bold text-gray-800 leading-none">{project?.projectOwner || 'Rahul Sharma'}</p>
        </div>
        <div className="space-y-1 relative group">
          <Label>Last Modified</Label>
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold text-gray-800 leading-none">{fmt(lastModified)}</p>
            <ArrowUpRight className="w-3 h-3 text-blue-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Project Stage</Label>
          <p className="text-sm font-bold text-gray-800 leading-none">Design Brief</p>
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <p className="text-sm font-bold text-gray-800 leading-none capitalize">{project?.category || 'Premium'}</p>
        </div>
      </div>
    </div>
  )
}

export function FinalActionCard({ isClosed = true }: { isClosed?: boolean }) {
  if (!isClosed) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
      <h3 className="text-sm font-black text-gray-800">Action</h3>
      <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-green-500/20 flex items-center justify-center">
          <CircleCheck className="w-6 h-6 text-[#22c55e]" />
        </div>
        <p className="text-[13px] text-gray-400 font-bold leading-relaxed px-4">This project has been closed and cannot be modified.</p>
      </div>
    </div>
  )
}

export function FinalCommentsCard({ comments = [] }: { comments?: BriefComment[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-gray-800">Comments</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 capitalize">{comments.length} comments</span>
      </div>
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 font-bold italic">No comments from MO yet</p>
          </div>
        ) : (
          comments.map((c, i) => (
            <div key={c.id} className="relative pl-6 space-y-2">
              <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 z-10 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]" />
                {i !== comments.length - 1 && <div className="w-[1.5px] grow bg-gray-50 mt-1" />}
              </div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 rounded-full border border-orange-100 shrink-0">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">Revision Requested</span>
                  </div>
                  {c.Creator && (
                    <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-100 px-2 py-0.5 rounded-md">
                      <span className="text-[10px] font-bold text-gray-800 leading-none">{c.Creator.name}</span>
                      {c.Creator.role && <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide leading-none">({roleLabel(c.Creator.role)})</span>}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {timeAgoShort(c.createdAt)}
                </span>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed font-semibold pr-2">{c.comment}</p>
            </div>
          ))
        )}
      </div>
      {comments.length > 2 && (
        <button className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-widest border-t border-gray-50 flex items-center justify-center gap-2">
          <span className="rotate-90">»</span> Show less
        </button>
      )}
    </div>
  )
}
