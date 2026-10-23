/* Table, Tabs, Breadcrumb — shadcn/ui (same classes as the original) */
import * as React from 'react'
import { Tabs as TabsPrimitive, Slot } from 'radix-ui'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------- Table ---------------- */
export function Table({ className, containerClassName, ...props }: React.ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div data-slot="table-container" className={cn('relative w-full overflow-x-auto', containerClassName)}>
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}
export const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => (
  <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
)
export const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => (
  <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)
export const TableFooter = ({ className, ...props }: React.ComponentProps<'tfoot'>) => (
  <tfoot data-slot="table-footer" className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)} {...props} />
)
export const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => (
  <tr data-slot="table-row" className={cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', className)} {...props} />
)
export const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => (
  <th
    data-slot="table-head"
    className={cn(
      'text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
)
export const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => (
  <td data-slot="table-cell" className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)} {...props} />
)
export const TableCaption = ({ className, ...props }: React.ComponentProps<'caption'>) => (
  <caption data-slot="table-caption" className={cn('text-muted-foreground mt-4 text-sm', className)} {...props} />
)

/* ---------------- Tabs ---------------- */
export const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />
)
export const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List data-slot="tabs-list" className={cn('bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]', className)} {...props} />
)
export const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
)
export const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />
)

/* ---------------- Breadcrumb ---------------- */
export const Breadcrumb = (props: React.ComponentProps<'nav'>) => <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
export const BreadcrumbList = ({ className, ...props }: React.ComponentProps<'ol'>) => (
  <ol data-slot="breadcrumb-list" className={cn('text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words', className)} {...props} />
)
export const BreadcrumbItem = ({ className, ...props }: React.ComponentProps<'li'>) => (
  <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />
)
export function BreadcrumbLink({ asChild, className, ...props }: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return <Comp data-slot="breadcrumb-link" className={cn('hover:text-foreground transition-colors', className)} {...props} />
}
export const BreadcrumbPage = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn('text-foreground font-normal', className)} {...props} />
)
export const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn('[&>svg]:size-3.5', className)} {...props}>
    {children ?? <ChevronRight />}
  </li>
)
export const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn('flex size-9 items-center justify-center', className)} {...props}>
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More</span>
  </span>
)
