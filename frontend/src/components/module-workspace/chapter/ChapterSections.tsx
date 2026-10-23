/** Sections of a chapter as an always-expanded multi accordion, 3 fields per row (original `ds`). */
import { useEffect, useState } from 'react'
import type { Control } from 'react-hook-form'
import { SmallLoader } from '@/components/common/PageLoader'
import type { ChapterSection } from '@/types/module-workspace'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion'
import ChapterField from './ChapterField'
import type { ChapterFormValues } from './validation'

type Props = { sections?: ChapterSection[]; control: Control<ChapterFormValues>; projectCategory?: string; loading?: boolean }

export default function ChapterSections({ sections, control, projectCategory, loading }: Props) {
  const [open, setOpen] = useState<string[]>([])
  useEffect(() => {
    if (sections?.length) setOpen(sections.map((s) => String(s.id)))
  }, [sections])

  if (loading)
    return (
      <div className="min-h-85">
        <SmallLoader />
      </div>
    )
  return (
    <Accordion type="multiple" value={open} onValueChange={setOpen} className="w-full pb-5">
      {sections?.map((s) => (
        <AccordionItem key={s.id} value={String(s.id)}>
          <AccordionTrigger className=" px-2 hover:no-underline cursor-pointer typo-headding">
            <span>{s.title}</span>
          </AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-2">
            {s.sectionFields?.map((f) => (
              <ChapterField key={f.id} field={{ ...f, sectionId: f.sectionId ?? s.id }} control={control} projectCategory={projectCategory} />
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
