/**
 * One calculated ratio of the COMMERCIAL key ratio (original `Aee`). Its value, remark and flag live in the
 * parent's `calculatedSectionValues` list ([{field_id, field_value, remark, is_flag, calculated_cost}]).
 * In compare mode (`disabled`) it shows the compared project's own `fields` instead.
 */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComOutputField } from '@/types/keyratio-compare'
import { checkValidity, commercialRangeLabel, crore, heightRange, isBlankNumber, type ComOutputState } from './calc'
import { FlagSvg, HoverInfo, RemarkDialog } from './parts'

/** Merge `patch` into the entry of `fieldId` (or append it) — original `$3`. */
export function upsertOutput(list: ComOutputState[], fieldId: number, patch: Partial<ComOutputState>) {
  return list.findIndex((o) => o?.field_id === fieldId) !== -1 ? list.map((o) => (o?.field_id === fieldId ? { ...o, ...patch } : o)) : [...list, { field_id: fieldId, ...patch }]
}

type Props = {
  className?: string
  id: number
  label?: string
  fields?: ComOutputField
  calculatedSectionValues?: ComOutputState[]
  setCalculatedSectionValues?: Dispatch<SetStateAction<ComOutputState[]>>
  category?: string
  disabled?: boolean
  similer?: boolean
  dynamicRange?: Parameters<typeof checkValidity>[3]
  buildingHeight?: unknown
  /** values imported from CSV ({outputData: [...]}) */
  importedOutputs?: ComOutputState[]
}

export default function CommercialRatioBox({
  className,
  id,
  label,
  fields,
  calculatedSectionValues,
  setCalculatedSectionValues,
  category,
  disabled = false,
  similer,
  dynamicRange,
  buildingHeight,
  importedOutputs,
}: Props) {
  const own = Array.isArray(calculatedSectionValues) ? calculatedSectionValues.find((o) => o?.field_id === id) : undefined
  const [flag, setFlag] = useState<unknown>(own?.is_flag ?? fields?.is_flag ?? null)
  const [remark, setRemark] = useState<string | null>((own?.remark as string) ?? (fields?.remark as string) ?? null)
  const value = disabled ? fields?.field_value : (own?.field_value ?? null)

  const imported = importedOutputs?.find((o) => o?.field_id === id)
  useEffect(() => {
    if (calculatedSectionValues && imported) {
      setFlag(imported.is_flag)
      setRemark(imported.remark as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imported?.remark, imported?.is_flag])

  useEffect(() => {
    if (!disabled) setCalculatedSectionValues?.((prev) => upsertOutput(prev, id, { remark, is_flag: flag as boolean }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remark, flag])

  const range = heightRange(id, category, buildingHeight) ?? (fields?.[category ?? ''] as string | undefined)
  const validity = checkValidity(value, range, id, dynamicRange, similer, buildingHeight as number, true)

  const prevValidity = useRef(validity.value)
  useEffect(() => {
    if (prevValidity.current === validity.value) return
    prevValidity.current = validity.value
    if (validity.value !== 'false') {
      setRemark('')
      setFlag(false)
    }
  }, [validity.value])

  const shownRemark = disabled ? fields?.remark : remark
  return (
    <div className={cn('text-sm sm:px-2 px-0 space-y-0.5 pb-1 m-0', className)}>
      <div className="flex items-center justify-between gap-2 pr-4 ">
        <span className="text-wrap typo-basic-2 capitalize">{label}</span>
        <button
          disabled={disabled}
          className={cn('cursor-pointer', disabled && 'cursor-not-allowed', validity.value === 'false' ? 'visible' : 'invisible')}
          type="button"
          onClick={() => setFlag((f: unknown) => !f)}
        >
          <FlagSvg flagged={disabled ? fields?.is_flag : flag} />
        </button>
      </div>
      <div className={cn('w-full ring-1 rounded-xs p-2 flex justify-between items-center h-8 overflow-hidden typo-basic-2', validity.boxColor)}>
        <span>
          {value as string} {!!value && fields?.units}
        </span>
        {validity.value == 'false' && <RemarkDialog remark={(shownRemark as string) ?? ''} hasRemark={!!shownRemark} onChange={setRemark} disabled={disabled} />}
      </div>
      <div className={cn('flex justify-between gap-2 items-center text-xs text-stone-700', validity.value !== 'pending' ? 'visible' : 'opacity-0 invisible')}>
        <div className="flex items-center gap-2 text-black font-semibold">
          <HoverInfo trigger={<Info size={14} className="cursor-pointer" />} message={validity.message} color={validity} />
          <span className={cn('flex items-center gap-0.5 text-xs text-black font-semibold', isBlankNumber(own?.calculated_cost) ? 'invisible' : 'visible')}>
            <span className={cn((own?.calculated_cost as number) < 0 ? 'text-green-700' : 'text-red-700')}>{crore(own?.calculated_cost)}</span>
          </span>
        </div>
        <div className="text-nowrap">{commercialRangeLabel(id, range)}</div>
      </div>
    </div>
  )
}
