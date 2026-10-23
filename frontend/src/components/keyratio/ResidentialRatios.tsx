/**
 * Right-hand tabs of the RESIDENTIAL key ratio (original doe/foe + soe/loe + uoe):
 * Design / Structure / MEP tabs (owner eye hover, tab rupee badge), sections with rupee impact
 * ("Optimized (Basis practical constraints)" + loading factor for Efficiency), and a RatioBox per ratio.
 */
import { Fragment, memo, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { cn } from '@/lib/utils'
import type { KeyCalFields, KeyRatioForm, ResCalField, ResidentialKeyRatio } from '@/types/keyratio-compare'
import { computeResidential, crore, isBlankNumber, residentialDynamicRange, residentialTabCost, type SectionCost } from './calc'
import { HoverInfo } from './parts'
import RatioBox, { type RemarkFlagMap } from './RatioBox'

type SectionProps = {
  tabValue: Record<string, ResCalField[]>
  keyRatioFormData: KeyRatioForm
  category: string
  disabled?: boolean
  setKeyRatioRemarksFlags: Dispatch<SetStateAction<RemarkFlagMap>>
  values: Record<number, number | null>
  validity: Record<number, { range: string | undefined | null }>
  sectionCost: Record<string, SectionCost>
  fieldCost: Record<number, number>
}

function SectionsBase({ tabValue, keyRatioFormData, category, disabled, setKeyRatioRemarksFlags, values, validity, sectionCost, fieldCost }: SectionProps) {
  return (
    <div className=" md:h-85 h-100 xl:h-[62dvh]  overflow-y-auto p-1">
      <section className="space-y-3">
        {Object.keys(tabValue).map((name) => {
          const cost = sectionCost?.[name]?.section_cost ?? null
          const text = cost !== null ? crore(Math.round(cost)) : null
          return (
            <Fragment key={name}>
              <div className="flex justify-between items-center px-2">
                <span className="font-semibold">{name}</span>
                {!isBlankNumber(cost) && <SectionCostLabel name={name} cost={cost as number} text={text} loading={sectionCost[name]?.newLoadingFactor} />}
              </div>
              <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 items-end space-y-2">
                {tabValue[name].map((f) => {
                  const v = values[f?.id]
                  return (
                    <RatioBox
                      key={f?.id}
                      style={f?.section === 'Efficiency' ? { order: f?.order_id } : undefined}
                      id={f?.id}
                      label={f?.field_name ?? ''}
                      labelValue={Number.isNaN(v) ? 0 : (v ?? '')}
                      range={validity?.[f?.id]?.range ?? ''}
                      filledIsFlagged={f?.is_flag}
                      filledRemark={f?.remark}
                      disabled={disabled}
                      setKeyRatioRemarksFlags={setKeyRatioRemarksFlags}
                      dynamicRange={residentialDynamicRange(f, category)}
                      fieldCostCalculation={fieldCost}
                      buildingHeight={keyRatioFormData.building_height}
                    />
                  )
                })}
              </div>
            </Fragment>
          )
        })}
      </section>
    </div>
  )
}
const Sections = memo(SectionsBase)

function SectionCostLabel({ name, cost, text, loading }: { name: string; cost: number; text: string | null; loading?: number }) {
  const efficiency = name.toLowerCase() === 'efficiency'
  const color = cost < 0 ? 'text-green-600' : 'text-red-600'
  const lf = isBlankNumber(loading) ? 0 : (loading as number).toFixed(2)
  const detail = efficiency ? (
    <>
      <span className="text-black typo-basic-2 font-semibold">Optimized (Basis practical constraints) </span>
      <span className="md:inline mr-1 hidden">:</span>
      <div className={cn(color, cost === 0 && 'text-gray-500')}>
        <span className="typo-basic-2 ">
          {text} ( Loading= {lf} )
        </span>
      </div>
    </>
  ) : (
    <span className={cn('space-x-1.5 ', color)}>{text}</span>
  )
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-end">
      <HoverInfo trigger={<span className={color}>₹</span>} message={detail} className="md:hidden " />
      <div className="hidden md:flex items-end justify-end typo-basic-2">{detail}</div>
    </div>
  )
}

const storageKey = (p?: string, m?: string) => `keyRatioRemarksFlags_${p}_${m}`
function readStore(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) as string) ?? {}
  } catch {
    return {}
  }
}

type Props = {
  calculatedRatios?: KeyCalFields
  keyRatioFormData: KeyRatioForm
  keyRatioData?: Partial<ResidentialKeyRatio>
  category: string
  disabled?: boolean
  setKeyRatioRemarksFlags: Dispatch<SetStateAction<RemarkFlagMap>>
  setCalculatedSectionValues: Dispatch<SetStateAction<{ section_id: number; section_cost: string }[]>>
  setKeyRatioFormData: Dispatch<SetStateAction<KeyRatioForm>>
  fieldCostCalculation: Record<number, number>
  setFieldCostCalculation: Dispatch<SetStateAction<Record<number, number>>>
}

function ResidentialRatios({
  calculatedRatios,
  keyRatioFormData,
  keyRatioData,
  category,
  disabled,
  setKeyRatioRemarksFlags,
  setCalculatedSectionValues,
  setKeyRatioFormData,
  fieldCostCalculation,
  setFieldCostCalculation,
}: Props) {
  const { projectId, moduleId } = useParams()
  const tabs = Object.keys(calculatedRatios || {})

  // same work the original `uoe` effect does on every input / category change
  const result = useMemo(
    () => computeResidential(calculatedRatios, keyRatioFormData, category, readStore(storageKey(projectId, moduleId))),
    [calculatedRatios, keyRatioFormData, category, projectId, moduleId],
  )
  const tabCost = useMemo(() => residentialTabCost(result.sectionCost), [result.sectionCost])

  useEffect(() => {
    setKeyRatioRemarksFlags(result.flags as RemarkFlagMap)
    setFieldCostCalculation((prev) => ({ ...prev, ...result.fieldCost }))
  }, [result, setKeyRatioRemarksFlags, setFieldCostCalculation])

  useEffect(() => {
    setCalculatedSectionValues(
      Object.values(result.sectionCost)
        .map((s) => (!s?.section_id || s?.section_cost == null ? null : { section_id: s.section_id, section_cost: `${s.section_cost} CR` }))
        .filter(Boolean) as { section_id: number; section_cost: string }[],
    )
  }, [result.sectionCost, setCalculatedSectionValues])

  const eff = result.sectionCost.Efficiency
  useEffect(() => {
    if (eff?.newLoadingFactor === undefined) return
    setKeyRatioFormData((prev) => ({
      ...prev,
      new_loading_factor: eff.newLoadingFactor,
      new_loading_factor2: eff.theoreticalLoadingFactor,
      far_permissible_maximization: eff.FARPermissibleMaximization,
      built_up_area_optimization: eff.BuitUpAreaOptimization,
      theoritical_maximum: eff.theoreticalApartmentEfficiencies,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eff?.newLoadingFactor, eff?.theoreticalLoadingFactor, eff?.theoreticalApartmentEfficiencies, eff?.FARPermissibleMaximization, eff?.BuitUpAreaOptimization])

  const [params, setParams] = useSearchParams()
  const [active, setActive] = useState(params.get('tab') || 'Design')
  const owners = keyRatioData?.projectOwners as Record<string, string | null | undefined> | undefined

  return (
    <div className="relative">
      <Tabs
        value={active}
        onValueChange={(v) => {
          setActive(v)
          setParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('tab', v)
            return next
          })
        }}
        defaultValue="Design"
        className="w-full p-2 bg-white rounded-md overflow-clip"
      >
        <TabsList className="gap-2 bg-white">
          {tabs.map((t) => (
            <div key={t} className="flex items-center gap-1 mt-7 sm:mt-0">
              <TabsTrigger
                value={t}
                className={cn(
                  'max-w-25 cursor-pointer text-black border-0 border-b-3 rounded-none shadow-none data-[state=active]:shadow-none data-[state=active]:text-blue-900',
                  active === t && 'border-blue-900 ',
                )}
              >
                {t}
              </TabsTrigger>
              {owners?.[t.toLowerCase() + '_owner'] && (
                <HoverInfo trigger={<Eye width={20} color="black" />} message={owners[t.toLowerCase() + '_owner']} className="cursor-pointer" />
              )}
            </div>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <motion.div key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <Sections
                keyRatioFormData={keyRatioFormData}
                tabValue={calculatedRatios![t]}
                disabled={disabled}
                category={category}
                setKeyRatioRemarksFlags={setKeyRatioRemarksFlags}
                values={result.values}
                validity={result.validity}
                sectionCost={result.sectionCost}
                fieldCost={fieldCostCalculation}
              />
              <div className="absolute right-3 top-1">
                <Badge variant="secondary" className={cn(!Math.round(tabCost?.[active]) && 'hidden', 'typo-basic-2', active !== t && 'hidden ')}>
                  {crore(Math.round(tabCost?.[active]))}
                </Badge>
              </div>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default memo(ResidentialRatios)
