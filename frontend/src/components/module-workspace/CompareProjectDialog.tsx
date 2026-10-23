/**
 * "Compare Project" dialog (original q5). Lets the user pick up to 2 other projects, saves the current
 * chapter as draft (PUT .../chapter/saveAndDraft/:c), then navigates to `<current>/compare?module=..&chapter=..&p1=..`.
 * On /keyratio pages pass `onSaveDraft` (key-ratio draft save); on /compare pages it only navigates.
 */
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogPortal, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import CompareProjectsPicker from '@/components/projects/CompareProjectsPicker'
import { saveChapterDraft } from '@/api/module-workspace'
import type { ChapterFormData } from '@/types/module-workspace'

type Props = {
  trigger: ReactNode
  /** chapter answers to save as draft before comparing (chapter pages) */
  module2FormData?: ChapterFormData | null
  /** custom draft save (key-ratio pages); replaces the chapter draft save */
  onSaveDraft?: () => Promise<unknown>
  currentProjectType?: string
}

export default function CompareProjectDialog({ trigger, module2FormData, onSaveDraft, currentProjectType }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [params] = useSearchParams()
  const { moduleId, chapterId = '1' } = useParams()

  const fromQuery = useMemo(() => {
    const ids: string[] = []
    params.forEach((v, k) => /^p\d+$/.test(k) && ids.push(v))
    return ids
  }, [params])
  const qModule = params.get('module') || '1'
  const qChapter = params.get('chapter') || '1'

  useEffect(() => setSelected(new Set(fromQuery)), [fromQuery])

  const toggle = (e: ChangeEvent<HTMLInputElement>, id: string) => {
    const checked = e.target.checked
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked && next.size < 3) next.add(id)
      else if (!checked) next.delete(id)
      return next
    })
  }

  const compare = async (e: MouseEvent) => {
    e.preventDefault()
    const base = pathname.split('/compare')[0]
    const qs = Array.from(selected)
      .map((id, i) => `p${i + 1}=${id}`)
      .join('&')
    const target = moduleId && chapterId ? `${base}/compare?module=${moduleId}&chapter=${chapterId}&${qs}` : `${base}/compare?module=${qModule}&chapter=${qChapter}&${qs}`
    if (pathname.endsWith('/compare')) return navigate(target)
    setSaving(true)
    try {
      if (onSaveDraft) await onSaveDraft()
      else if (module2FormData) await saveChapterDraft(module2FormData)
      toast.success('Project saved as draft')
      navigate(target)
    } catch (err) {
      toast.error('Failed to save project as draft')
      console.log('err--------------------', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogTrigger asChild>
          <Button variant="btnBlue">{trigger}</Button>
        </DialogTrigger>
        <DialogPortal>
          <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80" />
          <DialogContent className="sm:w-[450px] w-full min-h-[400px] p-0">
            <DialogHeader className="hidden">
              <DialogTitle />
              <DialogDescription />
            </DialogHeader>
            <CompareProjectsPicker selectedProjects={selected} handleCheckboxChange={toggle} currentProjectType={currentProjectType} />
            <Button variant="btnBlue" disabled={selected.size === 0 || saving} className="cursor-pointer absolute bottom-1.5 left-1.5" onClick={compare}>
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" /> Compare
                </>
              ) : (
                'Compare'
              )}
            </Button>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
