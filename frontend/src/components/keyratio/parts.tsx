/** Small building blocks used by the Key Ratio and Compare pages (original Kl, FG/yM, flag svg, remark dialog). */
import { memo, useState, type ReactNode } from 'react'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import { cn } from '@/lib/utils'
import { remarkEmptyIcon, remarkFilledIcon } from './icons'

/* ------------------------------------------------------------------ hover info (original Kl) */

type HoverInfoProps = { trigger: ReactNode; message: ReactNode; color?: { textColor?: string } | null; className?: string }

/** Hover card that also toggles on touch (original `Kl`). */
export function HoverInfo({ trigger, message, color, className = '' }: HoverInfoProps) {
  const [open, setOpen] = useState(false)
  return (
    <HoverCardPrimitive.Root data-slot="hover-card" open={open} onOpenChange={() => setOpen((o) => !o)}>
      <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" className={cn(className)} onTouchStart={() => setOpen((o) => !o)}>
        {trigger}
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal data-slot="hover-card-portal">
        <HoverCardPrimitive.Content
          data-slot="hover-card-content"
          align="center"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
            cn('text-xs w-full ', color?.textColor, className),
          )}
        >
          {message}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}

/* ------------------------------------------------------------------ numeric input (original FG / yM) */

export type NumberFieldChange = { target: { name: string; value: string; field_id: string | number | null } }

type NumberFieldProps = {
  label?: string
  placeholder?: string
  disabled?: boolean
  fieldUnit?: string
  labelClass?: string
  inputClass?: string
  wrapperClass?: string
  id?: string | number
  name?: string | number
  value?: string | number | null
  onChange?: (e: NumberFieldChange) => void
  type?: 'number' | 'text'
  required?: boolean
}

const NUMBER_RE = /^-?\d*(\.\d*)?$/

function NumberFieldBase({
  label,
  placeholder = '',
  disabled = false,
  fieldUnit,
  labelClass = '',
  inputClass = '',
  wrapperClass = '',
  id,
  name,
  value,
  onChange = () => {},
  type,
  required,
}: NumberFieldProps) {
  const [error, setError] = useState('')
  const change = (raw: string) => {
    let v = raw.replace(/[^0-9.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
    setError(v === '' ? 'Input cannot be empty' : '')
    onChange({ target: { name: String(name), value: v, field_id: id ?? null } })
  }
  const renderLabel = (text: string | undefined) => {
    if (id === 56 && text) {
      const [main, rest] = text.split('(')
      return (
        <div className="flex flex-col gap-1">
          <span>{main}</span>
          <span className="text-xs font-normal">{rest}</span>
        </div>
      )
    }
    return text === 'far' ? 'FAR' : text
  }
  return (
    <div className={cn('text-left px-2 m-0', wrapperClass)}>
      <Label htmlFor={id === undefined ? undefined : String(id)} className={cn('capitalize typo-basic-2 md:text-md pb-2', labelClass)}>
        {renderLabel(label)}
      </Label>
      <div className="relative w-full ">
        <Input
          id={id === undefined ? undefined : String(id)}
          name={name === undefined ? undefined : String(name)}
          value={value ?? ''}
          maxLength={20}
          className={`w-full typo-basic-2 min-w-25 pr-8 bg-white focus-visible:ring-1 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-moz-appearance:textfield]  ${inputClass} ${error ? 'ring-1 ring-red-500' : ''}`}
          onBlur={() => setError('')}
          placeholder={placeholder}
          disabled={disabled}
          type="text"
          inputMode={type === 'number' ? 'decimal' : undefined}
          required={required}
          onChange={(e) => {
            if (type !== 'number' || NUMBER_RE.test(e.target.value)) change(e.target.value)
          }}
        />
        {fieldUnit && (
          <p
            className={`text-sm absolute right-3 top-1/2 transform -translate-y-1/2 text-black bg-white px-1 pointer-events-none transition-opacity duration-200 ${disabled && 'text-gray-400'}`}
          >
            {fieldUnit}
          </p>
        )}
      </div>
      <p className="text-red-500 text-xs min-h-[1rem] text-right px-2">{error || ' '}</p>
    </div>
  )
}
export const NumberField = memo(NumberFieldBase)

/* ------------------------------------------------------------------ flag + remark */

const FLAG_PATH =
  'M19.3311 2.22921V11.9996C19.3311 12.4484 18.9663 12.8132 18.5151 12.8132H7.93108V21.77H8.74468C8.96046 21.77 9.1674 21.8557 9.31998 22.0083C9.47256 22.1609 9.55828 22.3678 9.55828 22.5836V22.586C9.55828 22.8018 9.47256 23.0087 9.31998 23.1613C9.1674 23.3139 8.96046 23.3996 8.74468 23.3996H5.48548C5.2697 23.3996 5.06275 23.3139 4.91017 23.1613C4.75759 23.0087 4.67188 22.8018 4.67188 22.586V22.5836C4.67188 22.3678 4.75759 22.1609 4.91017 22.0083C5.06275 21.8557 5.2697 21.77 5.48548 21.77H6.30148V1.41321C6.30148 1.19743 6.38719 0.990487 6.53977 0.837907C6.69235 0.685328 6.8993 0.599609 7.11508 0.599609H7.11748C7.33326 0.599609 7.5402 0.685328 7.69278 0.837907C7.84536 0.990487 7.93108 1.19743 7.93108 1.41321H18.5151C18.7315 1.41321 18.939 1.49918 19.0921 1.65221C19.2451 1.80524 19.3311 2.01279 19.3311 2.22921Z'

/** Flag icon (red when flagged). */
export const FlagSvg = ({ flagged, size = 20 }: { flagged?: unknown; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path className={cn(!!flagged && 'fill-red-600')} d={FLAG_PATH} fill="#7C7C7C" />
  </svg>
)

type RemarkProps = { remark: string; hasRemark: boolean; onChange: (v: string) => void; disabled?: boolean }

/** Remark dialog inside a ratio box (trigger shows the empty / filled remark icon). */
export function RemarkDialog({ remark, hasRemark, onChange, disabled = false }: RemarkProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="cursor-pointer min-w-5">
        <img src={hasRemark ? remarkFilledIcon : remarkEmptyIcon} alt="" width={18} />
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Enter Remarks here!</DialogTitle>
          <DialogDescription className="text-center space-y-5 pt-5" asChild>
            <div>
              <Input
                disabled={disabled}
                placeholder="Remarks"
                value={remark || ''}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setOpen(false)
                  }
                }}
              />
              <Button onClick={() => setOpen(false)} disabled={disabled} variant="btnBlue" className={cn('cursor-pointer', disabled && 'cursor-not-allowed')}>
                Save Changes
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
