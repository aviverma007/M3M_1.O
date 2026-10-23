/** Horizontal MODULE-1..N progress stepper shown at the top of module pages (original Xk / hG). */
import { Fragment, memo } from 'react'
import { useParams } from 'react-router-dom'
import { useProject, useProjectModules } from '@/api/projects'
import statusActive from '@/assets/images/status-active.png'
import statusCompleted from '@/assets/images/status-completed.png'
import statusPending from '@/assets/images/status-pending.png'

const iconFor = (status?: string) => (status === 'completed' ? statusCompleted : status === 'active' ? statusActive : statusPending)

function ModuleStepper() {
  const { projectId } = useParams()
  const { data: project } = useProject(projectId)
  const { data: modules } = useProjectModules(projectId, project?.projectType)
  const rows = modules?.rows ?? []
  return (
    <div className="hidden sm:flex items-center w-fit max-w-[75%] pl-16 pr-4 pb-14 pt-4 justify-start">
      {rows.map((m, i) => (
        <Fragment key={m.name || i}>
          <div className="flex flex-col items-center relative flex-shrink-0 group">
            <div className="z-10 bg-white rounded-full transition-all duration-300 transform group-hover:scale-110">
              <img src={iconFor(m.projectModule?.status)} alt={m.projectModule?.status} className="w-6 h-6 object-contain" />
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-36 text-center px-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-0.5 pointer-events-none">{`Module-${i + 1}`}</p>
              <p className="text-[10px] lg:text-[12px] font-bold text-[#21496B] leading-tight break-words line-clamp-2 px-1">{m.name}</p>
            </div>
          </div>
          {i < rows.length - 1 && (
            <div className="flex-1 min-w-[120px] max-w-[180px] h-[2px] mx-[-1px] bg-gray-200 rounded-full overflow-hidden self-center mb-0.5">
              <div className={`h-full transition-all duration-700 ease-out ${m.projectModule?.status === 'completed' ? 'w-full bg-[#21496B]' : 'w-0'}`} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}

export default memo(ModuleStepper)
