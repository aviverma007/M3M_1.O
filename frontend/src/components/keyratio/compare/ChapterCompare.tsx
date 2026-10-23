/**
 * Chapter comparison for design modules (original `Je` + `Gs` chapter list + `Ge` table).
 * Save & Next saves the current project's chapter (PUT .../chapter/:c) and moves to the next chapter's compare.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlignLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { LoadingButton } from '@/components/common'
import SideBar from '@/components/module-workspace/SideBar'
import { statusWiseIcon } from '@/components/module-workspace/chapter/ChapterList'
import { saveChapter, saveProjectModule } from '@/api/module-workspace'
import { cn } from '@/lib/utils'
import type { CompareResponse } from '@/types/keyratio-compare'
import CompareChapterField, { type ChapterAnswer } from './CompareChapterField'
import { chapterSimilarity } from './similarity'

type SearchData = { module: string; chapter: string }
type Props = { hideEntry: boolean; isEntryenable: boolean; completeCompareProjectData: Partial<CompareResponse>; searchParamData: SearchData }

/** Chapter tab list (original `Gs`). */
function ChapterTabs({ data, search, query, projectId, moduleId, className }: { data: Partial<CompareResponse>; search: SearchData; query: string; projectId?: string; moduleId?: string; className?: string }) {
  const rows = data?.currentProject?.moduleData?.rows ?? data?.comparedProjects?.[0]?.moduleData?.rows ?? []
  return (
    <TabsList
      className={cn(
        'flex-col md:w-1/5 w-full min-w-50 bg-white rounded-md py-2 md:px-4 px-0 md:inline md:min-h-[calc(100dvh-180px)]  h-full gap-1 justify-start',
        className,
      )}
    >
      {rows.map((o) => {
        const active = search?.chapter == String(o?.id)
        const pending = o?.status === 'pending'
        const to =
          data?.currentProject != null
            ? `/dashboard/project/${projectId}/modules/${moduleId}/chapter/${o?.id}/compare?module=${moduleId}&chapter=${o?.id}&${query}`
            : `/dashboard/compare?module=${search?.module}&chapter=${o?.id}&${query}`
        const label = (
          <span className="text-xs text-wrap capitalize">
            Chapter {o.chapterNumber}: {o.title}
          </span>
        )
        return (
          <TabsTrigger
            key={o?.id}
            value={String(o?.id)}
            disabled={pending}
            className={cn(
              'w-full rounded-none p-0 rounded-r-full md:rounded-none md:rounded-tr-3xl overflow-hidden text-start md:ring-0 ring-1 ring-[var(--mainTheamColor)]/30 tabListMaxMin',
              pending && 'opacity-50 pointer-events-none',
            )}
          >
            {pending ? (
              <div className="w-full bg-gray-200 p-2 text-gray-500 flex items-center space-x-2 cursor-not-allowed tabListMaxMin">
                {statusWiseIcon(o?.status)}
                {label}
              </div>
            ) : (
              <Link
                to={to}
                className={cn(
                  active
                    ? 'bg-[#21496B] p-2 w-full text-white flex items-center space-x-2 tabListMaxMin'
                    : 'w-full bg-white p-2 text-[#21496B] flex items-center space-x-2 tabListMaxMin',
                )}
              >
                {statusWiseIcon(o?.status, active)}
                {label}
              </Link>
            )}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}

/** Comparison table of one chapter (original `Ge`). */
function ChapterTable({ data, search, isEntryenable, hideEntry, onAnswer }: { data: Partial<CompareResponse>; search: SearchData; isEntryenable: boolean; hideEntry: boolean; onAnswer: (a: ChapterAnswer) => void }) {
  const x = data.currentProject
  const r = data.comparedProjects ?? []
  const similar = useMemo(() => chapterSimilarity(r), [r])
  const first = r[0]
  if (!first) return <p>No data available</p>
  return (
    <div className="overflow-x-auto">
      <Table className="table-auto">
        <TableHeader className="bg-white ">
          <TableRow>
            <TableHead className="px-4 py-2 capitalize text-black text-[15px] ">{first.moduleData?.rows?.find((n) => n?.id == parseInt(search.chapter))?.title}</TableHead>
            {x?.id && <TableHead className="px-4 py-2 text-black text-[15px] ">{x?.name}</TableHead>}
            {r.map((n, t) => (
              <TableHead key={t} className="px-4 py-2 text-black text-[15px] ">
                {n?.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {first.moduleData?.rows?.map((d, m) =>
            d?.chapterSections?.map((a, u) => (
              <Fragment key={`section-${a.id}`}>
                <TableRow className="lg:text-lg text-sm bg-gray-100">
                  <TableCell className="px-4 py-2  font-semibold" colSpan={2 + r.length}>
                    {a?.title}
                  </TableCell>
                </TableRow>
                {a?.sectionFields?.map((l) => {
                  const own = x?.moduleData?.rows?.[m]?.chapterSections?.[u]?.sectionFields?.find((M) => M?.id === l?.id)
                  return (
                    <TableRow
                      key={`field-${l?.id}`}
                      className={cn('border-none pt-2  p-0', isEntryenable && similar[l?.id] && 'bg-stone-200 hover:bg-stone-200 opacity-50', hideEntry && similar[l?.id] && 'hidden')}
                    >
                      <TableCell className="px-4 py-2 w-[250px] min-w-40 whitespace-normal md:whitespace-nowrap capitalize typo-basic-2">{l?.fieldName}</TableCell>
                      {x?.id && (
                        <TableCell className="px-4 py-2 w-[250px]">
                          <CompareChapterField field={own} category={x?.category} onChange={onAnswer} />
                        </TableCell>
                      )}
                      {r.map((M, U) => (
                        <TableCell key={`cmp-${U}-${l.id}`} className="px-4 py-2 w-[250px] ">
                          <CompareChapterField field={M?.moduleData?.rows?.[m]?.chapterSections?.[u]?.sectionFields?.find((J) => J.id === l.id)} category={M?.category} disabled />
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </Fragment>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ChapterCompare({ hideEntry, isEntryenable, completeCompareProjectData: h, searchParamData: _ }: Props) {
  const { projectId: x, moduleId: r, chapterId: f } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const answers = useRef<Record<number, ChapterAnswer>>({})
  const [saving, setSaving] = useState(false)

  const query = useMemo(() => {
    const ids: string[] = []
    params.forEach((v, k) => /^p\d+$/.test(k) && ids.push(v))
    return ids.map((v, i) => `p${i + 1}=${v}`).join('&')
  }, [params])

  useEffect(() => {
    answers.current = {}
  }, [r, f])

  const chapter = h?.currentProject?.moduleData?.rows?.find((l) => l?.id == Number(_?.chapter))
  const isLast = chapter?.isLastChapter ?? false

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }
  const saveNext = async () => {
    const R = parseInt(f as string)
    const b = parseInt(r as string)
    setSaving(true)
    try {
      await saveChapter({ projectId: Number(x), moduleId: b, chapterId: R, data: Object.values(answers.current) as never })
      await saveProjectModule({ projectId: x, moduleId: b, completedChapters: chapter?.chapterNumber })
      navigate(isLast ? `/dashboard/project/${x}/modules` : `/dashboard/project/${x}/modules/${b}/chapter/${R + 1}/compare?module=${b}&chapter=${R + 1}&${query}`)
    } catch (w) {
      toast.error((w as Error)?.message || 'Failed to save chapter data.')
    } finally {
      setSaving(false)
    }
  }

  const listProps = { data: h, search: _, query, projectId: x, moduleId: r }
  return (
    <section>
      <Tabs value={_?.chapter || ''} className="w-full flex-row my-2 relative md:gap-2 gap-0 ">
        <div className="block md:hidden ">
          <SideBar trigger={<AlignLeft className="text-white pl-1" />} side="left" className="block md:hidden w-65 pr-2" classTrigger="z-1 bg-[var(--mainTheamColor)] rounded-r-full p-1 top-1 -left-5">
            <ChapterTabs {...listProps} />
          </SideBar>
        </div>
        <ChapterTabs {...listProps} className="hidden md:block" />
        {h?.comparedProjects?.[0]?.moduleData?.rows?.map((l) => (
          <TabsContent key={l.id} value={l.id.toString()} className="mt-0  h-[calc(100dvh-180px)] md:w-4/5 relative overflow-auto bg-white rounded-sm">
            <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ChapterTable data={h} search={_} hideEntry={hideEntry} isEntryenable={isEntryenable} onAnswer={(a) => (answers.current[a.sectionFieldId] = a)} />
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
      {x && (
        <div className=" flex justify-end gap-2">
          <Button onClick={goBack} variant="outline" className="border-blue-900 border-1 cursor-pointer">
            Go Back
          </Button>
          {x && <LoadingButton handleClick={saveNext} variant="btnBlue" title="Save & Next" loading={saving} />}
        </div>
      )}
    </section>
  )
}
