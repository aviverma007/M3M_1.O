/**
 * Chapter field cell of the compare table (original `Us` -> `Ke` select / `We` multiselect).
 * The current project's cell is editable and reports {answer, remark, isFlaged, anyOtherAnswer} upward;
 * compared projects' cells are disabled.
 */
import { useEffect, useState } from 'react'
import { HoverCard as HC } from 'radix-ui'
import { PanelBottomClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/misc'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MultiSelect, { mapFieldOptions } from '@/components/module-workspace/MultiSelect'
import { editRemarkIcon } from '@/components/module-workspace/icons'
import { cn } from '@/lib/utils'
import type { CompareSectionField } from '@/types/keyratio-compare'
import { FlagSvg } from '../parts'

export type ChapterAnswer = { sectionId?: number; sectionFieldId: number; answer: string | string[]; remark: string; isFlaged: number; benchmarkAnswer: string[]; anyOtherAnswer: string }

const eq = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase()
function matches(value: string | string[] | undefined, bench?: string[]) {
  if (!value || !bench) return null
  if (Array.isArray(value) && value.length > 0) return value.every((v) => bench.some((b) => eq(b, v)))
  if (typeof value === 'string') return bench.some((b) => eq(b, value))
  return false
}

function benchFor(f: CompareSectionField | undefined, category?: string) {
  switch (category) {
    case 'mid-end':
      return f?.midEndAns
    case 'premium':
      return f?.premiumAns
    case 'affluent':
      return f?.affluentAns
    case 'hi_street':
    case 'high_street':
      return f?.hiStreetAns
    case 'enclosed_mall':
      return f?.enclosedMallAns
    default:
      return []
  }
}

type Props = { field?: CompareSectionField; category?: string; disabled?: boolean; onChange?: (a: ChapterAnswer) => void }

export default function CompareChapterField({ field, category, disabled = false, onChange }: Props) {
  if (!field) return null
  const bench = benchFor(field, category)
  switch (field.fieldType) {
    case 'select':
      return <SelectCell field={field} bench={bench} disabled={disabled} onChange={onChange} />
    case 'multiselect':
      return <MultiCell field={field} bench={bench} disabled={disabled} onChange={onChange} />
    default:
      return <input type="text" value={(field.value as string) || ''} onChange={() => {}} disabled={disabled} />
  }
}

type CellProps = { field: CompareSectionField; bench?: string[]; disabled: boolean; onChange?: (a: ChapterAnswer) => void }

function RemarkDialog({ remark, setRemark, disabled, className, title, saveLabel, placeholder }: { remark: string; setRemark: (v: string) => void; disabled: boolean; className: string; title: string; saveLabel: string; placeholder: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={className}>
        <img src={editRemarkIcon} alt="Edit remark" width={20} className="cursor-pointer" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center space-y-2 pt-5" asChild>
            <div>
              <Input
                placeholder={disabled ? ' ' : placeholder}
                value={remark}
                disabled={disabled}
                onChange={(e) => {
                  setRemark(e.target.value)
                  setError(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setOpen(false)
                  }
                }}
              />
              <span className={cn(error ? 'text-red-500 text-xs visible block' : 'invisible block')}>Remark is required!</span>
              <Button
                onClick={() => {
                  if (!remark.trim()) return setError(true)
                  setOpen(false)
                }}
                onBlur={() => setError(false)}
                variant="btnBlue"
              >
                {saveLabel}
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

function useCellState(field: CompareSectionField) {
  const fv = field.fieldValue
  const [anyOther, setAnyOther] = useState(fv?.anyOtherAnswer || '')
  const [remark, setRemark] = useState(fv?.remark || '')
  const [flag, setFlag] = useState(Number(fv?.isFlaged || 0))
  return { anyOther, setAnyOther, remark, setRemark, flag, setFlag }
}

/** Single select (original `Ke`). */
function SelectCell({ field, bench, disabled, onChange }: CellProps) {
  const initial = field.fieldValue?.answer
  const [value, setValue] = useState<string>((Array.isArray(initial) ? initial[0] : initial) ?? '')
  const s = useCellState(field)
  const anyOther = value?.toLowerCase() === 'any other'
  const match = value && bench ? matches(value, bench) : null

  useEffect(() => {
    if (!disabled) onChange?.({ sectionId: field.sectionId, sectionFieldId: field.id, answer: value, remark: s.remark, isFlaged: s.flag, benchmarkAnswer: bench ?? [], anyOtherAnswer: s.anyOther })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, s.remark, s.flag, s.anyOther, disabled])
  useEffect(() => {
    if (match) {
      s.setRemark('')
      s.setFlag(0)
      s.setAnyOther('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match])

  return (
    <>
      <div className="pt-1 px-0 pb-1 w-full relative flex gap-2 justify-start items-center">
        <Select
          value={value}
          onValueChange={(v) => {
            setValue(v)
            s.setRemark('')
            s.setAnyOther('')
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              'ring-1 min-w-[150px]  max-w-[200px] bg-white border-none transition-all',
              anyOther && 'min-w-28 ',
              !value || match === null ? 'ring-gray-300 w-full' : anyOther ? 'ring-blue-400' : match ? 'ring-green-400 w-full' : 'ring-red-400 w-full',
            )}
          >
            <SelectValue placeholder={`Select ${field?.fieldName}`} />
          </SelectTrigger>
          <SelectContent>
            {field.sectionFieldOptions.map((o) => (
              <SelectItem key={o.id} value={o.fieldOption}>
                {o.fieldOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && !match && (
          <div className={cn(anyOther ? 'relative' : 'block')}>
            {anyOther && <Input placeholder="Enter Answer" className="bg-white w-full" value={s.anyOther} onChange={(e) => s.setAnyOther(e.target.value)} disabled={disabled} />}
            <RemarkDialog
              remark={s.remark}
              setRemark={s.setRemark}
              disabled={disabled}
              className={cn('text-blue-500 underline ', anyOther ? 'absolute top-1/2 right-3 transform -translate-y-1/2 bg-white' : 'block')}
              title="Enter Remark"
              saveLabel="Save Remark"
              placeholder="Enter remark"
            />
          </div>
        )}
        <button
          onClick={() => s.setFlag(s.flag === 1 ? 0 : 1)}
          className={cn(value && !match ? 'visible cursor-pointer' : 'invisible', disabled && 'cursor-not-allowed')}
          type="button"
          disabled={disabled}
        >
          <FlagSvg flagged={s.flag} size={18} />
        </button>
      </div>
      <div className={cn('text-xs', value && !match ? ' text-red-600' : ' text-green-600')}>
        {match === null ? '' : match ? 'Selected answer matches the benchmark' : 'Selected value does not match benchmark'}
      </div>
    </>
  )
}

function ValuesHover({ values, bad, className }: { values: string[]; bad: string[]; className: string }) {
  const [open, setOpen] = useState(false)
  return (
    <HC.Root open={open} onOpenChange={() => setOpen((o) => !o)}>
      <HC.Trigger className="cursor-pointer" onTouchStart={() => setOpen((o) => !o)}>
        <PanelBottomClose size={13} />
      </HC.Trigger>
      <HC.Portal>
        <HC.Content
          align="center"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50 w-64 rounded-md border p-4 shadow-md outline-hidden',
            className,
          )}
        >
          {values.map((c, i) => (
            <Badge key={i} variant="secondary" className={bad.includes(c) ? 'text-red-400 m-1 font-normal' : 'text-green-400 m-1 font-normal'}>
              {c}
            </Badge>
          ))}
        </HC.Content>
      </HC.Portal>
    </HC.Root>
  )
}

/** Multi select (original `We`). */
function MultiCell({ field, bench, disabled, onChange }: CellProps) {
  const initial = field.fieldValue?.answer
  const [value, setValue] = useState<string[]>(Array.isArray(initial) ? initial : [])
  const s = useCellState(field)
  const ANY = 'Any Other'
  const hasAny = value.some((c) => c === ANY)
  const options = mapFieldOptions(field.sectionFieldOptions).map((c) => (c.value === ANY ? { ...c, isDisabled: value.length > 0 && !hasAny } : { ...c, isDisabled: hasAny }))
  const selected = value.map((c) => options.find((z) => z.value === c)).filter((o): o is (typeof options)[number] => !!o)
  const match = value && bench ? matches(value, bench) : null
  const bad = bench ? value.filter((z) => !bench.some((b) => eq(b, z))) : []
  const anyOtherSel = value.some((c) => typeof c === 'string' && c.toLowerCase() === 'any other')

  useEffect(() => {
    if (!disabled) onChange?.({ sectionId: field.sectionId, sectionFieldId: field.id, answer: value, remark: s.remark, isFlaged: s.flag, benchmarkAnswer: bench ?? [], anyOtherAnswer: s.anyOther })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), s.remark, s.flag, s.anyOther, disabled])
  useEffect(() => {
    if (match) {
      s.setRemark('')
      s.setFlag(0)
      s.setAnyOther('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match])

  return (
    <div className={cn('space-y-2 w-3/4', disabled && 'opacity-65')}>
      <div className="flex gap-1 items-center justify-start">
        <MultiSelect
          isDisabled={disabled}
          value={selected}
          options={options}
          onChange={(next) => setValue(next.map((z) => z.value))}
          className={cn('basic-multi-select max-w-[200px] w-full ', disabled && 'cursor-not-allowed')}
          controlStyle={{ minWidth: '200px', width: 'auto' }}
        />
        {match === false && value.length > 0 && (
          <div className="relative">
            {anyOtherSel && <Input placeholder={disabled ? ' ' : 'Your Answer'} className={cn('bg-white min-w-[120px]')} onChange={(e) => s.setAnyOther(e.target.value)} value={s.anyOther} disabled={disabled} />}
            <RemarkDialog
              remark={s.remark}
              setRemark={s.setRemark}
              disabled={disabled}
              className={cn(' absolute top-1/2 right-2 transform -translate-y-1/2 cursor-pointer min-w-[30px]', !anyOtherSel && 'static translate-none')}
              title="Enter Remarks here!"
              saveLabel="Save Changes"
              placeholder="Remarks"
            />
          </div>
        )}
        <button onClick={() => s.setFlag(s.flag === 1 ? 0 : 1)} className={cn(value.length > 0 && !match ? 'visible ' : 'invisible', disabled && 'cursor-not-allowed')} type="button">
          <FlagSvg flagged={s.flag} size={18} />
        </button>
      </div>
      {match === false && value.length > 0 && (
        <span className="text-red-600 text-xs flex items-center gap-2">
          Selected value does not match benchmark
          <ValuesHover values={value} bad={bad} className="text-xs p-1 sm:w-xl w-sm" />
        </span>
      )}
      {value.length > 0 && match && (
        <span className="text-green-600 text-xs flex items-center gap-2">
          Selected answer matches the benchmark
          <ValuesHover values={value} bad={bad} className="text-xs p-1" />
        </span>
      )}
    </div>
  )
}
