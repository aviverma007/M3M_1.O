import { useCallback, useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { http } from '@/api/http'
import { getComments } from '@/api/design-brief'
import { Button } from '@/components/ui/button'
import type { BriefComment, BriefUser } from '@/types/design-brief'
import { roleLabel, timeAgo } from './utils'

const SUPER_ROLES = ['super_admin', 'superadmin', 'admin', 'super admin']

const DEFAULT_VIEW_ROLES = [
  ...SUPER_ROLES,
  'general_admin',
  'general admin',
  'general_contributor',
  'design_admin',
  'design admin',
  'design_contributor',
  'design contributor',
]
const DEFAULT_POST_ROLES = [...SUPER_ROLES, 'general_admin', 'general admin', 'design_admin', 'design admin']

type Props = {
  projectId?: string
  department: string
  activeUser: Pick<BriefUser, 'role'> | null
  title?: string
  emptyText?: string
  /** 'mo' = only comments by super admins, 'review' = everything else, 'all' = no filter */
  commentType?: 'all' | 'mo' | 'review'
  viewRoles?: string[]
  postRoles?: string[]
  postTitle?: string
}

const statusClass = (s: string | null) => {
  switch (s) {
    case 'Revision Requested':
      return 'bg-[#fffbeb] text-[#d97706] border-[#fef3c7]'
    case 'Returned for Correction':
      return 'bg-[#fff1f2] text-[#e11d48] border-[#ffe4e6]'
    default:
      return 'bg-blue-50 text-blue-600 border-blue-100'
  }
}

/** Department / MO comment thread with a post box (original `ReviewComments`). */
export default function ReviewComments({
  projectId,
  department,
  activeUser,
  title = 'Comments',
  emptyText,
  commentType = 'all',
  viewRoles = DEFAULT_VIEW_ROLES,
  postRoles = DEFAULT_POST_ROLES,
  postTitle = 'Add Feedback / Comment',
}: Props) {
  const [comments, setComments] = useState<BriefComment[]>([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const role = activeUser?.role?.toLowerCase() ?? ''
  const canView = viewRoles.includes(role)
  const canPost = postRoles.includes(role)

  const load = useCallback(async () => {
    try {
      let rows = await getComments(projectId ?? '', department)
      const isMo = (c: BriefComment) => !!c.Creator && SUPER_ROLES.includes(c.Creator.role?.toLowerCase())
      if (commentType === 'mo') rows = rows.filter(isMo)
      else if (commentType === 'review') rows = rows.filter((c) => !isMo(c))
      setComments(rows)
    } catch (e) {
      console.error('Error fetching comments:', e)
    } finally {
      setLoading(false)
    }
  }, [projectId, department, commentType])

  useEffect(() => {
    load()
  }, [load])

  const post = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      await http.post('/design-brief-comment', {
        projectId: parseInt(projectId ?? ''),
        department,
        comment: text,
        status: 'Revision Requested',
      })
      setText('')
      load()
      toast.success('Comment added successfully')
    } catch (e) {
      console.error('Error adding comment:', e)
      toast.error('Failed to add comment')
    } finally {
      setPosting(false)
    }
  }

  if (!canView) return null
  const visible = expanded ? comments : comments.slice(0, 3)
  const empty = commentType === 'mo' ? 'No comments from Management Office yet.' : 'No department comments yet.'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <span className="text-sm text-gray-400 font-semibold">{comments.length} comments</span>
      </div>

      <div className="space-y-0 text-sm">
        {loading ? (
          <div className="text-center py-4 text-gray-400 font-medium">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl font-medium">{emptyText || empty}</div>
        ) : (
          <>
            {visible.map((c, i) => (
              <div key={c.id} className="relative pl-8 pb-8 last:pb-0">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 z-10 ${c.status === 'Returned for Correction' ? 'bg-[#e11d48]' : 'bg-[#d97706]'}`} />
                  {i !== visible.length - 1 && <div className="w-[2px] grow bg-gray-100" />}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest leading-none ${statusClass(c.status)}`}
                      >
                        {c.status || 'Revision Requested'}
                      </span>
                      {c.Creator && (
                        <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-100 px-2 py-1 rounded-md">
                          <span className="text-[12px] font-bold text-gray-800 leading-none">{c.Creator.name}</span>
                          {c.Creator.role && (
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-none">({roleLabel(c.Creator.role)})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-400 text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed font-semibold text-[13px] pt-1">{c.comment}</p>
                </div>
              </div>
            ))}
            {comments.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors pt-4 pl-0"
              >
                <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
      </div>

      {canPost && (
        <div className="pt-8 border-t border-gray-100 space-y-4">
          <p className="text-sm font-black text-gray-800 uppercase tracking-wider">{postTitle}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Provide specific feedback or requested changes..."
            className="w-full min-h-[120px] p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300 font-medium"
          />
          <div className="flex justify-end">
            <Button
              onClick={post}
              disabled={posting || !text.trim()}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold h-11 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              {posting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
