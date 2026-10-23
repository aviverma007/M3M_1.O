/**
 * /dashboard/project/:projectId/modules/:moduleId/keyratio (original main-bundle `xoe`):
 * renders the residential (`goe`) or commercial (`Qae`) key ratio page by project type,
 * and an <Outlet/> for the nested /compare route (the page itself is hidden there).
 */
import { Outlet, useMatch } from 'react-router-dom'
import { useProject } from '@/api/projects'
import { useParams } from 'react-router-dom'
import ResidentialKeyRatio from '@/components/keyratio/ResidentialKeyRatio'
import CommercialKeyRatio from '@/components/keyratio/CommercialKeyRatio'

export default function KeyRatioPage() {
  const { projectId } = useParams()
  const { data: project } = useProject(projectId)
  const exact = useMatch('/dashboard/project/:projectId/modules/:moduleId/keyratio')
  if (!project?.projectType) return null
  const Page = project.projectType === 'residential' ? ResidentialKeyRatio : CommercialKeyRatio
  return (
    <>
      {exact && <Page key={`${projectId}`} project={project} />}
      <Outlet />
    </>
  )
}
