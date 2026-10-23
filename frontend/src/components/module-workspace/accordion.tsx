/* shadcn Accordion exactly as customised in the original bundle (pM / hM / mM / gM). */
import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDown, CircleMinus, CirclePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Accordion(props: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn('border-b last:border-b-0', className)} {...props} />
}

/** `arrowDown` shows a chevron; otherwise a minus (open) / plus (toggled) circle like the original. */
export function AccordionTrigger({
  className,
  children,
  arrowDown = false,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { arrowDown?: boolean }) {
  const [toggled, setToggled] = React.useState(false)
  const iconCls = 'text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 '
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        onClick={() => setToggled((v) => !v)}
        data-slot="accordion-trigger"
        className={cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 ',
          className,
        )}
        {...props}
      >
        {children}
        {arrowDown ? (
          <ChevronDown className="AccordionChevron transition-transform duration-200" aria-hidden />
        ) : toggled ? (
          <CirclePlus className={iconCls} />
        ) : (
          <CircleMinus className={iconCls} />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all"
      {...props}
    >
      <div className={cn('pt-0 pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}
