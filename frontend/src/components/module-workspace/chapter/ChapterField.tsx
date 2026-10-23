/** One chapter field: select / multiselect / input with benchmark check, remark dialog and flag (original `is`). */
import { memo, useEffect, useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { FieldAnswer, SectionField } from '@/types/module-workspace'
import MultiSelect, { mapFieldOptions } from '../MultiSelect'
import { editRemarkIcon } from '../icons'
import { benchmarkFor, matchesBenchmark, nonMatching } from './benchmark'
import { useFieldMeta } from './fieldMeta'
import type { ChapterFormValues } from './validation'

const FLAG_PATH =
  'M19.3311 2.22921V11.9996C19.3311 12.4484 18.9663 12.8132 18.5151 12.8132H7.93108V21.77H8.74468C8.96046 21.77 9.1674 21.8557 9.31998 22.0083C9.47256 22.1609 9.55828 22.3678 9.55828 22.5836V22.586C9.55828 22.8018 9.47256 23.0087 9.31998 23.1613C9.1674 23.3139 8.96046 23.3996 8.74468 23.3996H5.48548C5.2697 23.3996 5.06275 23.3139 4.91017 23.1613C4.75759 23.0087 4.67188 22.8018 4.67188 22.586V22.5836C4.67188 22.3678 4.75759 22.1609 4.91017 22.0083C5.06275 21.8557 5.2697 21.77 5.48548 21.77H6.30148V1.41321C6.30148 1.19743 6.38719 0.990487 6.53977 0.837907C6.69235 0.685328 6.8993 0.599609 7.11508 0.599609H7.11748C7.33326 0.599609 7.5402 0.685328 7.69278 0.837907C7.84536 0.990487 7.93108 1.19743 7.93108 1.41321H18.5151C18.7315 1.41321 18.939 1.49918 19.0921 1.65221C19.2451 1.80524 19.3311 2.01279 19.3311 2.22921Z'

const ANY_OTHER = 'Any Other'
const isAnyOther = (v: unknown) => typeof v === 'string' && v.toLowerCase() === 'any other'

type RemarkProps = { open: boolean; setOpen: (o: boolean) => void; remark: string; setRemark: (v: string) => void; error: boolean; onSave: () => void; triggerClass: string }

/** Pencil icon -> "Enter Remarks here!" dialog. */
function RemarkDialog({ open, setOpen, remark, setRemark, error, onSave, triggerClass }: RemarkProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClass}>
        <img src={editRemarkIcon} alt="Edit remark" width={20} />
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Enter Remarks here!</DialogTitle>
          <DialogDescription className="text-center space-y-5 pt-5" asChild>
            <div>
              <Input
                placeholder="Remarks"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setOpen(false)
                  }
                }}
              />
              {error && <span className="text-red-600 text-xs">Remark is required!</span>}
              <Button variant="btnBlue" className="font-normal mt-3" onClick={onSave}>
                Save Changes
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

type Props = { field: SectionField; control: Control<ChapterFormValues>; projectCategory?: string }

function ChapterField({ field, control, projectCategory }: Props) {
  const meta = useFieldMeta()
  const stored = meta.get(field.id)
  const [anyOther, setAnyOther] = useState(stored?.anyOtherAnswer || field.fieldValue?.anyOtherAnswer || '')
  const [remark, setRemarkState] = useState(stored?.remark || field.fieldValue?.remark || '')
  const [flag, setFlag] = useState<number>(stored?.isFlaged || field.fieldValue?.isFlaged || 0)
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [remarkError, setRemarkError] = useState(false)

  const multi = field.fieldType === 'multiselect'
  const saved = field.fieldValue?.answer
  const { field: ctl, fieldState } = useController({
    name: `fields.${field.id}`,
    control,
    defaultValue: multi ? (saved as string[]) || [] : Array.isArray(saved) ? saved[0] || '' : saved || '',
  })
  const value: FieldAnswer = ctl.value || (multi ? [] : '')
  const bench = benchmarkFor(field, projectCategory)
  const match = matchesBenchmark(value, bench)
  const missing = nonMatching(value, bench)

  useEffect(() => {
    if (match) {
      setRemarkState('')
      setFlag(0)
      setAnyOther('')
    }
  }, [match])

  useEffect(() => {
    meta.update({ sectionId: field.sectionId, sectionFieldId: field.id, answer: value, remark, isFlaged: flag, benchmarkAnswer: bench ?? [], anyOtherAnswer: anyOther })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), remark, flag, field.sectionId, field.id, anyOther])

  const saveRemark = () => {
    if (!remark && match === false) setRemarkError(true)
    else {
      setRemarkError(false)
      setRemarkOpen(false)
    }
  }
  const setRemark = (v: string) => {
    setRemarkState(v)
    setRemarkError(false)
  }
  const remarkProps = { open: remarkOpen, setOpen: setRemarkOpen, remark, setRemark, error: remarkError, onSave: saveRemark }
  const values = Array.isArray(value) ? value : [value]
  const hasAnyOther = values.some(isAnyOther)

  const renderControl = () => {
    switch (field.fieldType) {
      case 'select': {
        const v = value as string
        return (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <Select
                value={v}
                onValueChange={(nv) => {
                  ctl.onChange(nv)
                  setRemarkOpen(false)
                }}
              >
                <SelectTrigger
                  className={cn(
                    'ring-1 md:min-w-2/3 md:max-w-2/3 w-full bg-white ',
                    v?.toLowerCase() === 'any other' && 'min-w-28',
                    fieldState.invalid ? 'ring-red-400' : v ? (match ? 'ring-green-400' : 'ring-red-400') : 'ring-gray-300',
                  )}
                >
                  <SelectValue placeholder={`Select ${field.fieldName}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.sectionFieldOptions?.map((o) => (
                    <SelectItem key={o.id} value={o.fieldOption}>
                      {o.fieldOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {v && match === false && (
                <div className="relative">
                  {isAnyOther(v) && <Input placeholder="Enter Your Answer" className="bg-white" required onChange={(e) => setAnyOther(e.target.value)} value={anyOther} />}
                  <RemarkDialog
                    {...remarkProps}
                    triggerClass={cn(' absolute top-1/2 right-2 transform -translate-y-1/2 cursor-pointer', !isAnyOther(v) && 'static translate-none')}
                  />
                </div>
              )}
            </div>
            {fieldState.invalid && <span className="text-red-600 text-xs">Invalid field value</span>}
            {v && match === false && <span className="text-red-600 text-xs">Selected value does not match benchmark</span>}
            {v && match && <span className="text-green-600 text-xs">Selected answer matches the benchmark</span>}
          </div>
        )
      }
      case 'multiselect': {
        const opts = mapFieldOptions(field.sectionFieldOptions)
        const sel = Array.isArray(value) ? value : []
        const anySel = sel.some((o) => o === ANY_OTHER)
        const options = opts.map((o) => (o.value === ANY_OTHER ? { ...o, isDisabled: sel.length > 0 && !anySel } : { ...o, isDisabled: anySel }))
        const selectedOpts = sel.map((s) => options.find((o) => o.value === s)).filter((o): o is (typeof options)[number] => !!o)
        return (
          <div className="space-y-2 md:w-3/4 w-full">
            <div className="flex gap-1 items-center">
              <MultiSelect
                value={selectedOpts}
                options={options}
                onChange={(next) => ctl.onChange(next.map((n) => n.value))}
                className="basic-multi-select md:max-w-[200px] w-full"
                controlStyle={{ width: hasAnyOther ? '180px' : 'auto' }}
              />
              {sel.length > 0 && match === false && (
                <div className="relative">
                  {hasAnyOther && <Input placeholder="Your Answer" className="bg-white min-w-[120px]" onChange={(e) => setAnyOther(e.target.value)} value={anyOther} />}
                  <RemarkDialog
                    {...remarkProps}
                    triggerClass={cn(' absolute top-1/2 right-2 transform -translate-y-1/2 cursor-pointer', !hasAnyOther && 'static translate-none')}
                  />
                </div>
              )}
            </div>
            {fieldState.invalid && <span className="text-red-600 text-xs">Invalid field value</span>}
            {sel.length > 0 && match === false && (
              <span className="text-red-600 text-xs">
                Selected value {missing.length > 0 && <p className="font-bold">`{missing.join(', ')}</p>}`{' '}does not match benchmark
              </span>
            )}
            {sel.length > 0 && match && <span className="text-green-600 text-xs">Selected answer matches the benchmark</span>}
          </div>
        )
      }
      default:
        return (
          <>
            <Input placeholder={`Enter ${field.fieldName}`} type={field.fieldType} value={(ctl.value as string) ?? ''} onChange={(e) => ctl.onChange(e.target.value)} />
            {fieldState.invalid && <span className="text-red-600 text-xs">Invalid field value</span>}
            {value && match === false && <span className="text-red-600 text-xs">Selected value does not match benchmark</span>}
          </>
        )
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <Label className="block text-sm font-medium space-x-4 cursor-pointer">
        <span className="capitalize typo-para">{field.fieldName}</span>
        {!match && (
          <button className="cursor-pointer" onClick={() => setFlag(flag === 1 ? 0 : 1)} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className={cn(flag ? 'fill-red-600' : '')} d={FLAG_PATH} fill="#7C7C7C" />
            </svg>
          </button>
        )}
      </Label>
      {renderControl()}
    </div>
  )
}

export default memo(ChapterField)
