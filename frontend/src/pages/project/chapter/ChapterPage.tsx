/**
 * /dashboard/project/:projectId/modules/:moduleId/chapter/:chapterId (original page-D07XDqUo).
 * Chapter list (status icons) | module stepper + Import CSV + Compare Project | sectioned benchmark form.
 * The nested /compare route renders through the <Outlet/> instead of the page.
 */
import { useEffect, useState } from 'react'
import { Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlignLeft, Table } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent } from '@/components/ui/data'
import { useProject } from '@/api/projects'
import { chapterKeys, importModuleCsv, useChapters } from '@/api/module-workspace'
import SideBar from '@/components/module-workspace/SideBar'
import ModuleStepper from '@/components/module-workspace/ModuleStepper'
import ImportCsvDialog from '@/components/module-workspace/ImportCsvDialog'
import CompareProjectDialog from '@/components/module-workspace/CompareProjectDialog'
import ChapterList from '@/components/module-workspace/chapter/ChapterList'
import ChapterForm from '@/components/module-workspace/chapter/ChapterForm'
import { FieldMetaProvider } from '@/components/module-workspace/chapter/fieldMeta'
import type { ChapterFormData } from '@/types/module-workspace'

export default function ChapterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isChapterRoute = useMatch('/dashboard/project/:projectId/modules/:moduleId/chapter/:chapterId')
  const { projectId, moduleId, chapterId } = useParams()
  const { data: project } = useProject(projectId)
  const { data: current, isFetching, isPlaceholderData } = useChapters(projectId, moduleId, chapterId)
  const chapters = current?.rows ?? []

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [module2FormData, setModule2FormData] = useState<ChapterFormData | null>(null)

  // no chapter in the URL -> first chapter
  useEffect(() => {
    if (!chapterId && chapters.length) navigate(`/dashboard/project/${projectId}/modules/${moduleId}/chapter/${chapters[0].id}`)
  }, [chapters, chapterId, navigate, projectId, moduleId])

  // a pending (locked) chapter can't be opened: go to the active chapter (or the last one)
  useEffect(() => {
    if (isPlaceholderData || !chapters.length || !chapters.some((c) => c.chapterSections)) return
    const here = chapters.find((c) => String(c.id) === chapterId)
    if (here && here.status !== 'pending') return
    const target = chapters.find((c) => c.status === 'active') ?? chapters.find((c) => c.isLastChapter)
    if (target && String(target.id) !== chapterId) navigate(`/dashboard/project/${projectId}/modules/${moduleId}/chapter/${target.id}`, { replace: true })
  }, [chapters, chapterId, navigate, projectId, moduleId, isPlaceholderData])

  const upload = async () => {
    const fd = new FormData()
    if (importFile) fd.append('file', importFile)
    setImporting(true)
    try {
      await importModuleCsv({ file: fd, projectId, moduleId })
      setImportOpen(false)
      setImportFile(null)
      // original reloads the page; refetching gives the same result
      qc.invalidateQueries({ queryKey: chapterKeys.all })
      qc.invalidateQueries({ queryKey: ['projects'] })
    } catch (e) {
      toast.error((e as Error)?.message || 'Chapter operation failed')
    } finally {
      setImporting(false)
    }
  }

  const loadingSections = isFetching && !chapters.find((c) => String(c.id) === chapterId)?.chapterSections

  return (
    <>
      {!!isChapterRoute && (
        <section className="2xl:container m-auto relative overflow-hidden">
          <Tabs value={chapterId || ''} className="w-full flex-row">
            <div className="block md:hidden ">
              <SideBar trigger={<AlignLeft />} side="left" className="block md:hidden w-65 pr-2">
                <ChapterList chaptersData={chapters} projectId={projectId} moduleId={moduleId} />
              </SideBar>
            </div>
            <ChapterList chaptersData={chapters} projectId={projectId} moduleId={moduleId} className="hidden md:block " />
            <div className="md:w-4/5 w-full relative">
              <div className=" w-full m-auto flex flex-wrap justify-between items-center py-2 bg-white rounded-md">
                <ModuleStepper />
                <section className="flex gap-2 pr-5 pl-10 md:pl-0">
                  <ImportCsvDialog
                    selectedImportFile={importFile}
                    setSelectedImportFile={setImportFile}
                    handleMediaUpload={upload}
                    isLoading={importing}
                    open={importOpen}
                    handleOpenPopUp={() => setImportOpen(true)}
                    handleClosePopUp={() => setImportOpen(false)}
                  />
                  <CompareProjectDialog
                    trigger={
                      <>
                        <span className="md:inline sm:hidden inline">Compare Project</span> <Table className="hidden md:hidden sm:inline" />
                      </>
                    }
                    module2FormData={module2FormData}
                  />
                </section>
              </div>
              {chapters.map((c) => (
                <TabsContent key={c.id} value={String(c.id)} className="mt-0 md:h-[calc(100dvh-230px)] h-full overflow-y-auto ">
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <FieldMetaProvider key={`${c.id}-${c.chapterSections ? 'loaded' : 'empty'}`}>
                      <ChapterForm chapter={c} chapters={chapters} project={project} loading={loadingSections} setModule2FormData={setModule2FormData} />
                    </FieldMetaProvider>
                  </motion.div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </section>
      )}
      <Outlet />
    </>
  )
}
