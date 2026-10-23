/**
 * Port of the original "SideBar" chunk (SideBar-ZwOq9EwF.js). That chunk bundles:
 *   - To  (default export here): the slide-in Sheet that holds the chapter list on mobile
 *   - Ao/Po/Mo/Vo: react-select + option mapper + custom MultiValue / Option  -> ./MultiSelect
 *   - Eo/Ro/Do: chapter status icons (pending / active-selected / active)     -> ./icons
 *
 * Props contract (same as the original `To`):
 *   trigger       ReactNode  content of the trigger button (e.g. <AlignLeft/>)
 *   title?        ReactNode  sheet title (rendered in SheetHeader)
 *   description?  ReactNode  sheet description
 *   children      ReactNode  sheet body (the chapter list)
 *   side?         'left'|'right'|'top'|'bottom' (default 'right')
 *   className?    string     classes for the SheetContent
 *   classTrigger? string     extra classes for the trigger (base: "absolute top-4 left-4 z-1")
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, type SheetSide } from './Sheet'

export type SideBarProps = {
  trigger: ReactNode
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  side?: SheetSide
  className?: string
  classTrigger?: string
}

export default function SideBar({ trigger, title, description, children, side, className, classTrigger }: SideBarProps) {
  return (
    <Sheet>
      <SheetTrigger className={cn('absolute top-4 left-4 z-1', classTrigger)}>{trigger}</SheetTrigger>
      <SheetContent side={side} className={className}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}

/* re-exports so consumers can import everything the original chunk provided from one path */
// eslint-disable-next-line react-refresh/only-export-components
export { default as MultiSelect, mapFieldOptions, type MultiOption } from './MultiSelect'
// eslint-disable-next-line react-refresh/only-export-components
export { chapterPendingIcon, chapterActiveIcon, chapterActiveSelectedIcon } from './icons'
