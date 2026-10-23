/** Page-size select, "Total" badge and pagination links (original `Je` + shadcn Pagination). */
import type { ComponentProps } from 'react'
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type LinkProps = ComponentProps<'a'> & { isActive?: boolean; size?: 'icon' | 'default' }

function PaginationLink({ className, isActive, size = 'icon', ...props }: LinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }), className)}
      {...props}
    />
  )
}

function pageList(current: number, total: number) {
  const out: (number | '...')[] = []
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  out.push(1)
  if (start > 2) out.push('...')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('...')
  if (total > 1) out.push(total)
  return out
}

export default function ProjectsPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onLimitChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  const pages = pageList(currentPage, totalPages)
  return (
    <div className="flex justify-between items-center">
      <div>
        <Select onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="w-full cursor-pointer sm:text-base text-xs">
            <SelectValue placeholder="10 per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="30">30 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Total <Button variant="outline">{totalItems}</Button>
        </div>
        <nav role="navigation" aria-label="pagination" data-slot="pagination" className="mx-auto flex w-full justify-center border-1 rounded-sm">
          <ul data-slot="pagination-content" className="flex flex-row items-center gap-1">
            <li data-slot="pagination-item">
              <PaginationLink
                aria-label="Go to previous page"
                size="default"
                className={cn('gap-1 px-2.5 sm:pl-2.5', 'cursor-pointer text-primary transition-opacity', currentPage === 1 && 'cursor-not-allowed opacity-50')}
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              >
                <ChevronLeft />
                <span className="hidden md:block">Previous</span>
              </PaginationLink>
            </li>
            {pages.map((p, i) => (
              <li key={`${i}${p}`} data-slot="pagination-item" className="hidden sm:inline-block ">
                {p === '...' ? (
                  <span aria-hidden data-slot="pagination-ellipsis" className="flex size-9 items-center justify-center">
                    <Ellipsis className="size-4" />
                    <span className="sr-only">More pages</span>
                  </span>
                ) : (
                  <PaginationLink className="cursor-pointer" onClick={() => onPageChange(p)} isActive={currentPage === p}>
                    {p}
                  </PaginationLink>
                )}
              </li>
            ))}
            <li data-slot="pagination-item">
              <PaginationLink
                aria-label="Go to next page"
                size="default"
                className={cn('gap-1 px-2.5 sm:pr-2.5', 'cursor-pointer text-primary transition-opacity', currentPage === totalPages && 'cursor-not-allowed opacity-50')}
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              >
                <span className="hidden md:block">Next</span>
                <ChevronRight />
              </PaginationLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
