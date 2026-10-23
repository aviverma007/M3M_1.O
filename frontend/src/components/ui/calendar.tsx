import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

/** Calendar with the same class map as the original app (react-day-picker v9). */
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      formatters={{ formatWeekdayName: (d) => d.toLocaleDateString('en-US', { weekday: 'narrow' }) }}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: cn('text-sm font-medium', props.captionLayout === 'dropdown' ? 'hidden' : ''),
        nav: 'space-x-1 flex items-center',
        button_previous: cn(buttonVariants({ variant: 'outline' }), 'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1'),
        button_next: cn(buttonVariants({ variant: 'outline' }), 'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1'),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: 'size-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day_button: cn(buttonVariants({ variant: 'ghost' }), 'size-8 p-0 font-bold aria-selected:opacity-100'),
        range_end: 'day-range-end',
        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground',
        outside: 'day-outside font-normal text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        dropdowns: 'flex items-center justify-center gap-2',
        dropdown_root: 'relative flex items-center',
        dropdown: 'p-1 bg-transparent text-sm font-medium border border-input rounded-md focus:ring-1 focus:ring-ring cursor-pointer appearance-none pr-6 z-10',
        ...classNames,
      }}
      components={{
        Chevron: ({ className: c, orientation, ...rest }) => {
          const Icon = orientation === 'left' ? ChevronLeft : orientation === 'right' ? ChevronRight : orientation === 'up' ? ChevronUp : ChevronDown
          return <Icon className={cn('size-4', c, 'absolute right-1 pointer-events-none')} {...rest} />
        },
      }}
      {...props}
    />
  )
}
