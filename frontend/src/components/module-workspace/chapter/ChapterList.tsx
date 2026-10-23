/** Vertical chapter tab list ("Chapter N: Title" with status icons) — original `re`. */
import { NavLink } from 'react-router-dom'
import { TabsList, TabsTrigger } from '@/components/ui/data'
import { cn } from '@/lib/utils'
import statusCompleted from '@/assets/images/status-completed.png'
import type { Chapter, ChapterStatus } from '@/types/module-workspace'
import { chapterActiveIcon, chapterActiveSelectedIcon, chapterPendingIcon } from '../icons'

/** Status icon (original statusWiseIcon). */
// eslint-disable-next-line react-refresh/only-export-components
export function statusWiseIcon(status: ChapterStatus | string | undefined, isActive?: boolean) {
  switch (status) {
    case 'pending':
      return <img src={chapterPendingIcon} alt="pending chapter" className="w-5 h-5" />
    case 'active':
      return <img src={isActive ? chapterActiveSelectedIcon : chapterActiveIcon} alt="active chapter" className="w-5 h-5" />
    case 'completed':
      return <img src={statusCompleted} alt="completed chapter" className="w-5 h-5" />
    default:
      return <></>
  }
}

type Props = { chaptersData: Chapter[]; projectId?: string; moduleId?: string; className?: string }

export default function ChapterList({ chaptersData, projectId, moduleId, className }: Props) {
  return (
    <TabsList
      className={cn(
        'flex-col md:w-1/5 w-full min-w-50 bg-white rounded-none py-2 md:px-4 px-0 md:inline md:min-h-[calc(100dvh-150px)]  h-full gap-1 justify-start',
        className,
      )}
    >
      {chaptersData.map((c) => {
        const pending = c.status === 'pending'
        const label = (
          <span className="text-xs text-wrap capitalize">
            Chapter {c.chapterNumber}: {c.title}
          </span>
        )
        return (
          <TabsTrigger
            key={c.id}
            value={String(c.id)}
            disabled={pending}
            className={cn(
              'w-full rounded-none p-0 rounded-r-full md:rounded-none md:rounded-tr-3xl overflow-hidden text-start md:ring-0 ring-1 ring-[var(--mainTheamColor)]/30 tabListMaxMin',
              pending ? 'opacity-50 pointer-events-none' : '',
            )}
          >
            {!pending ? (
              <NavLink
                to={`/dashboard/project/${projectId}/modules/${moduleId}/chapter/${c.id}`}
                className={({ isActive }) =>
                  isActive
                    ? 'bg-[#21496B] p-2 w-full text-white flex items-center space-x-2 tabListMaxMin'
                    : 'w-full bg-white p-2 text-[#21496B] flex items-center space-x-2 tabListMaxMin'
                }
              >
                {({ isActive }) => (
                  <>
                    {statusWiseIcon(c.status, isActive)}
                    {label}
                  </>
                )}
              </NavLink>
            ) : (
              <div className="w-full bg-gray-200 p-2 text-gray-500 flex items-center space-x-2 cursor-not-allowed tabListMaxMin">
                {statusWiseIcon(c.status)}
                {label}
              </div>
            )}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}
