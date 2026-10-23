/** /dashboard/project/:projectId/modules — module cards + footer actions (original page-DSi__SG4). */
import type { MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/common'
import { useProject, useProjectModules } from '@/api/projects'
import ModuleCard from '@/components/projects/modules/ModuleCard'
import { setModulePreview } from '@/components/module-workspace/preview'

type ModuleRowExtras = { projectModule: { moApprovedDocUrl?: string | null } | null }

export default function ModulesPage() {
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const { data: project } = useProject(projectId)
  const { data: modules } = useProjectModules(project ? projectId : undefined, project?.projectType)
  const rows = modules?.rows ?? []
  const completed = project?.status === 'completed'

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }
  const preview = () => {
    setModulePreview(true)
    navigate(`/dashboard/project/${projectId}/modules/${rows[0]?.id}/keyratio`)
  }
  const submit = () => {
    navigate('/dashboard')
    toast.success('Project submitted successfully')
  }

  return (
    <div className="m-auto overflow-hidden space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6 pt-0 auto-rows-fr items-stretch">
        {rows.map((m, i) => (
          <ModuleCard
            key={m.id}
            moduleName={m.name}
            moduleNo={i + 1}
            moduleId={m.originalModuleId || m.id}
            isDPR={!!m.originalModuleId}
            moduleStatus={m.projectModule?.status}
            parameters={m.projectModule?.allParams}
            deviations={m.projectModule?.deviations}
            benchmark={m.projectModule?.benchmarkParams}
            projectId={projectId}
            firstChapterId={m.firstChapterId}
            moApprovedDocUrl={(m as typeof m & ModuleRowExtras).projectModule?.moApprovedDocUrl}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2 pr-4">
        <Button onClick={goBack} variant="outline" className="border-blue-900 border-1 cursor-pointer text-blue-900">
          Go Back
        </Button>
        <Button onClick={() => navigate(`/dashboard/project/${projectId}?edit=true`)} variant="outline" className="border-blue-900 border-1 cursor-pointer text-blue-900">
          Edit Project Info
        </Button>
        {completed && (
          <Button onClick={preview} variant="outline" className="border-blue-900 border-1 cursor-pointer text-blue-900" type="button">
            Preview / Submit
          </Button>
        )}
        <LoadingButton type="submit" variant="btnBlue" title="Save & Next" disabled={!completed} handleClick={submit} />
      </div>
    </div>
  )
}
