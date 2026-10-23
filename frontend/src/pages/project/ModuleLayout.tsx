/**
 * Route element for /dashboard/project/:projectId/modules/:moduleId (original ModulesLayout chunk).
 * In "Preview / Submit" mode it shows the project details accordion and Previous / Next Module navigation;
 * otherwise it just renders the child route (keyratio, chapter/:chapterId, compare).
 */
import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProject, useProjectModules } from '@/api/projects'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/module-workspace/accordion'
import { useModulePreview } from '@/components/module-workspace/preview'
import type { Project } from '@/types'

function Info({ label, value, gap = true }: { label: string; value?: string | null; gap?: boolean }) {
  return (
    <div className="flex">
      <span className="md:w-30 w-40 inline-block text-gray-500">{label}</span>
      {gap && ' '}
      <span>{value}</span>
    </div>
  )
}

function ProjectDetails({ project }: { project?: Project }) {
  const p = project
  return (
    <Accordion className=" px-4  bg-white rounded-md" type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="typo-headding hover:no-underline cursor-pointer" arrowDown>
          Project Details
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="typo-headding font-semibold">Project Information</h2>
              <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 space-y-1 capitalize">
                <Info label="Project Type:" value={p?.projectType} />
                <Info label="Project Name:" value={p?.name} />
                <Info label="Category:" value={p?.category} />
                <Info label="Location:" value={p?.location} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="typo-headding font-semibold">User Information</h2>
              <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 space-y-1">
                <Info label="Name:" value={p?.userName} />
                <Info label="Email Id:" value={p?.userEmail} />
                <Info label="Mobile No:" value={p?.userNumber} />
                <Info label="Date:" value={p?.date} />
                <Info label="Designation:" value={p?.userDesignation} gap={false} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="typo-headding font-semibold">Owners Information</h2>
              <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 space-y-1">
                <Info label="Project Owner :" value={p?.projectOwner} />
                <Info label="Structure Owner :" value={p?.structureOwner} />
                <Info label="MEP Owner :" value={p?.mepOwner} />
                <Info label="Design Owner:" value={p?.designOwner} />
                <Info label="Interior Design Owner:" value={p?.interiorDesignOwner} gap={false} />
              </div>
            </div>
            <div />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default function ModuleLayout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const isPreview = useModulePreview()
  const [index, setIndex] = useState(0)
  const { data: project } = useProject(projectId && projectId !== 'undefined' && projectId !== 'null' ? projectId : undefined)
  const { data: modules } = useProjectModules(projectId, project?.projectType)
  const rows = modules?.rows ?? []

  useEffect(() => {
    if (!isPreview || !rows.length) return
    const m = rows[index]
    navigate(index === 0 ? `/dashboard/project/${projectId}/modules/${m?.id ?? 1}/keyratio` : `/dashboard/project/${projectId}/modules/${m?.id}/chapter/${m?.firstChapterId}`)
    // navigate only when the selected module changes (as original)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return (
    <div className="space-y-2 mt-2 w-full">
      {isPreview && (
        <>
          <ProjectDetails project={project} />
          <div className="rounded-md bg-white flex justify-between items-center py-2 md:px-5 p-1">
            <Button className="cursor-pointer" variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
              <ArrowLeft />
              <span className="sm:inline hidden">Previous Module</span>
            </Button>
            <div className="flex gap-1 text-center">
              <span className="font-semibold md:text-base text-xs md:inline hidden">Module {index + 1} -</span>
              <span className="font-semibold md:text-base text-xs ">{rows[index]?.name}</span>
            </div>
            <Button className="cursor-pointer" variant="ghost" onClick={() => setIndex((i) => i + 1)} disabled={index === rows.length - 1}>
              <span className="sm:inline hidden">Next Module</span>
              <ArrowRight />
            </Button>
          </div>
        </>
      )}
      <Outlet />
    </div>
  )
}
