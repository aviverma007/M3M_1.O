/* Generic UI pieces the chapters-a pages need that ui/ doesn't have (same markup/classes as the original). */
import * as React from 'react'
import { Accordion as AccordionPrimitive, HoverCard as HoverCardPrimitive } from 'radix-ui'
import { CircleMinus, CirclePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------- Accordion (original shadcn variant with +/- circle icons) ---------------- */
export const Accordion = (props: React.ComponentProps<typeof AccordionPrimitive.Root>) => <AccordionPrimitive.Root data-slot="accordion" {...props} />

export const AccordionItem = ({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) => (
  <AccordionPrimitive.Item data-slot="accordion-item" className={cn('border-b last:border-b-0', className)} {...props} />
)

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  // the original toggles its own icon state on click (not tied to data-state)
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
        {toggled ? <CirclePlus className={iconCls} /> : <CircleMinus className={iconCls} />}
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

/* ---------------- HoverCard ---------------- */
export const HoverCard = (props: React.ComponentProps<typeof HoverCardPrimitive.Root>) => <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
export const HoverCardTrigger = (props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) => (
  <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
)
export function HoverCardContent({ className, align = 'center', sideOffset = 4, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

/* ---------------- benchmark note ("Req: <value>") ---------------- */
export function ReqNote({ text, className = 'text-[10px] mt-1 text-gray-400', valueClassName = 'font-semibold text-blue-400' }: { text: string; className?: string; valueClassName?: string }) {
  return (
    <p className={className}>
      Req: <span className={valueClassName}>{text}</span>
    </p>
  )
}

/** Original injects this <style> on the unit/project level design pages. */
export function ScrollbarStyle({ css }: { css: string }) {
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
