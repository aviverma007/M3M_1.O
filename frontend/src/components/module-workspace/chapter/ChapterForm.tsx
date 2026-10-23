/** Form of one chapter: sections + Go Back / Save & Next (original `cs`). */
import { memo, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { LoadingButton } from '@/components/common'
import { projectKeys } from '@/api/projects'
import { chapterKeys, saveChapter, saveProjectModule } from '@/api/module-workspace'
import type { Project } from '@/types'
import type { Chapter, ChapterAnswerInput, ChapterFormData } from '@/types/module-workspace'
import ChapterSections from './ChapterSections'
import { useFieldMeta } from './fieldMeta'
import { chapterResolver, defaultFieldValues, type ChapterFormValues } from './validation'

type Props = {
  chapter: Chapter
  chapters: Chapter[]
  project?: Project
  loading?: boolean
  /** receives the current answers, used by "Compare Project" to save a draft first */
  setModule2FormData: (d: ChapterFormData) => void
}

function ChapterForm({ chapter, chapters, project, loading, setModule2FormData }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const meta = useFieldMeta()
  const [saving, setSaving] = useState(false)
  const sections = chapter.chapterSections
  const resolver = useMemo(() => chapterResolver(sections), [sections])
  const form = useForm<ChapterFormValues>({ resolver, defaultValues: defaultFieldValues(sections) })
  const { reset } = form

  useEffect(() => {
    if (sections) reset(defaultFieldValues(sections))
  }, [sections, reset])

  const build = (values: ChapterFormValues): ChapterAnswerInput[] =>
    (sections ?? []).flatMap((s) =>
      (s.sectionFields ?? []).map((f) => {
        const m = meta.get(f.id)
        return {
          sectionId: s.id,
          sectionFieldId: f.id,
          answer: values.fields?.[f.id] || 'answer',
          isFlaged: m?.isFlaged ?? 0,
          remark: m?.remark ?? '',
          benchmarkAnswer: m?.benchmarkAnswer ?? [],
          anyOtherAnswer: m?.anyOtherAnswer ?? '',
        }
      }),
    )

  useEffect(() => {
    setModule2FormData({ projectId: project?.id, moduleId: chapter.moduleId, chapterId: chapter.id, data: build(form.getValues()) })
    // recompute whenever any field's answer/remark/flag changes (original: on sectionFields store change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.version, sections, project?.id])

  const onSubmit = async (values: ChapterFormValues) => {
    setSaving(true)
    try {
      await saveChapter({ projectId: project?.id, moduleId: chapter.moduleId, chapterId: chapter.id, data: build(values) })
      await saveProjectModule({ projectId: project?.id, moduleId: chapter.moduleId, completedChapters: chapter.chapterNumber })
      qc.invalidateQueries({ queryKey: chapterKeys.all })
      qc.invalidateQueries({ queryKey: projectKeys.all })
      if (chapter.isLastChapter) navigate(`/dashboard/project/${project?.id}/modules`)
      else {
        const i = chapters.findIndex((c) => c.id === chapter.id)
        navigate(`/dashboard/project/${project?.id}/modules/${chapter.moduleId}/chapter/${chapters[i + 1]?.id}`)
      }
    } catch (e) {
      toast.error((e as Error)?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 px-2 ">
      <Form {...form}>
        <ChapterSections sections={sections} control={form.control} projectCategory={project?.category} loading={loading} />
        <div className="flex  gap-4 absolute bottom-2 right-4">
          <Button type="button" variant="btnBlue" onClick={() => navigate(-1)} className="bg-white text-black hover:bg-accent hover:text-accent-foreground">
            Go Back
          </Button>
          <LoadingButton title="Save & Next" loading={saving} variant="btnBlue" type="submit" />
        </div>
      </Form>
    </form>
  )
}

export default memo(ChapterForm)
