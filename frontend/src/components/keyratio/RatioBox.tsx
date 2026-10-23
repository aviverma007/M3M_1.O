/**
 * One calculated ratio of the RESIDENTIAL key ratio (original `ooe`/`ioe`):
 * label + flag toggle, value box coloured by benchmark validity (+ remark dialog when out of range),
 * info hover with the validity message, rupee impact and the benchmark range.
 * Remark/flag edits are mirrored to localStorage (`keyRatioRemarksFlags_<project>_<module>`) and reported upward.
 */
import { memo, useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkValidity, crore, isBlankNumber, residentialOutputUnit, residentialRangeLabel } from './calc'
import { FlagSvg, HoverInfo, RemarkDialog } from './parts'

export type RemarkFlagEntry = { field_id: number; field_value: unknown; remark: string; flag: unknown; isValid?: string }
export type RemarkFlagMap = Record<string | number, RemarkFlagEntry>

type Props = {
  className?: string
  id: number
  label?: string
  labelValue: unknown
  range?: string | null
  filledIsFlagged?: unknown
  filledRemark?: string | null
  disabled?: boolean
  setKeyRatioRemarksFlags: Dispatch<SetStateAction<RemarkFlagMap>>
  /** compared (read-only) project id — such boxes never write to localStorage */
  checkProjectId?: number | string
  similer?: boolean
  dynamicRange?: Parameters<typeof checkValidity>[3]
  fieldCostCalculation?: Record<number, number>
  style?: CSSProperties
  buildingHeight?: unknown
}

const storageKey = (p?: string, m?: string) => `keyRatioRemarksFlags_${p}_${m}`
function readStore(key: string): Record<string, { isFlagged?: unknown; remark?: string }> {
  try {
    return JSON.parse(localStorage.getItem(key) as string) ?? {}
  } catch {
    return {}
  }
}

function RatioBox({
  className,
  id,
  label,
  labelValue,
  range,
  filledIsFlagged,
  filledRemark,
  disabled = false,
  setKeyRatioRemarksFlags,
  checkProjectId,
  similer,
  dynamicRange,
  fieldCostCalculation,
  style,
  buildingHeight,
}: Props) {
  const { projectId, moduleId } = useParams()
  const key = storageKey(projectId, moduleId)
  const [flag, setFlag] = useState<unknown>()
  const [remark, setRemark] = useState<string>()
  const validity = checkValidity(labelValue, range, id, dynamicRange, similer, buildingHeight as number)

  useEffect(() => {
    const stored = readStore(key)[id]
    if (stored) {
      setFlag(stored.isFlagged ?? 0)
      setRemark(stored.remark ?? '')
    } else {
      setFlag(filledIsFlagged ? 1 : 0)
      setRemark(filledRemark || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledIsFlagged, filledRemark])

  useEffect(() => {
    if (checkProjectId || flag === undefined) return
    try {
      localStorage.setItem(key, JSON.stringify({ ...readStore(key), [id]: { isFlagged: flag, remark } }))
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remark, flag])

  useEffect(() => {
    setKeyRatioRemarksFlags((prev) => ({ ...prev, [id]: { field_id: id, field_value: labelValue, remark: remark as string, flag, isValid: validity.value } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remark, flag, validity.value])

  // reset remark/flag when the value moves back inside the benchmark (skip first render)
  const prevValidity = useRef(validity.value)
  useEffect(() => {
    if (prevValidity.current === validity.value) return
    prevValidity.current = validity.value
    if (validity.value !== 'false') {
      setRemark('')
      setFlag(false)
    }
  }, [validity.value])

  const unit = residentialOutputUnit(id)
  const cost = fieldCostCalculation?.[id]
  return (
    <div className={cn('text-sm sm:px-2 px-0 space-y-0.5 pb-1 m-0', className)} style={style}>
      <div className="flex items-center justify-between gap-2 pr-4 ">
        <span className="text-wrap capitalize typo-basic-2">{label}</span>
        <button
          disabled={disabled}
          className={cn('cursor-pointer', disabled && 'cursor-not-allowed', validity.value === 'false' ? 'visible' : 'invisible')}
          type="button"
          onClick={() => setFlag((f: unknown) => !f)}
        >
          <FlagSvg flagged={flag} />
        </button>
      </div>
      <div className={cn('w-full ring-1 rounded-xs p-2 flex justify-between items-center h-8 overflow-hidden typo-basic-2', validity.boxColor)}>
        <span>
          {labelValue as string} {unit && labelValue ? unit : ''}
        </span>
        {validity.value == 'false' && <RemarkDialog remark={remark ?? ''} hasRemark={!!remark} onChange={setRemark} disabled={disabled} />}
      </div>
      <div className={cn('flex justify-between gap-2 items-center text-xs text-stone-700', validity.value !== 'pending' ? 'visible' : 'opacity-0 invisible')}>
        <div className="flex items-center gap-2 text-black font-semibold">
          <HoverInfo trigger={<Info size={14} className="cursor-pointer" />} message={validity.message} color={validity} />
          <span className={cn('flex items-center gap-0.5 text-xs text-black font-semibold', !isBlankNumber(cost) && id !== 27 ? 'visible' : 'invisible')}>
            {crore(Math.round(cost as number))}
          </span>
        </div>
        <div className="text-nowrap">{residentialRangeLabel(id, range)}</div>
      </div>
    </div>
  )
}

export default memo(RatioBox)
