/**
 * Right-hand tabs of the COMMERCIAL key ratio (original Nee/jee + Mee + Ree):
 * recalculates every output from the inputs, runs the cost engine (field / section / tab cost),
 * and renders the sections ("Area efficiencies" shows "Saleable Area Maximization - ₹ x Cr").
 */
import { Fragment, memo, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { cn } from '@/lib/utils'
import type { ComKeyRatioData } from '@/types/keyratio-compare'
import { commercialDynamicRange, commercialValue, computeCommercial, crore, inputValue, isBlankNumber, type ComInput, type ComOutputState, type ComRef } from './calc'
import CommercialRatioBox, { upsertOutput } from './CommercialRatioBox'
import { HoverInfo } from './parts'

export type CommercialCostState = { sectionCost: Record<string, number>; tabCost: Record<string, number> }

/** Recalculate output values + costs whenever inputs change (original `Ree` hook). */
export function useCommercialCosts({
  inputs,
  outputs,
  setOutputs,
  refs,
  category,
}: {
  inputs: ComInput[]
  outputs: ComOutputState[]
  setOutputs: Dispatch<SetStateAction<ComOutputState[]>>
  refs: ComRef[]
  category?: string
}): CommercialCostState {
  const costs = useMemo(() => computeCommercial(inputs, outputs, refs, category), [inputs, outputs, refs, category])

  useEffect(() => {
    setOutputs((prev) => {
      let changed = false
      const map = new Map(prev.map((o) => [o.field_id, o]))
      for (const r of refs) {
        const cur = map.get(r.field_id)
        const c = costs.fieldCost[r.field_id]
        if (!cur || cur.calculated_cost !== c) {
          changed = true
          map.set(r.field_id, { ...cur, field_id: r.field_id, calculated_cost: c })
        }
      }
      return changed ? Array.from(map.values()) : prev
    })
  }, [costs, refs, setOutputs])

  useEffect(() => {
    refs.forEach((r) => setOutputs((prev) => upsertOutput(prev, r.field_id, { field_value: commercialValue(r, inputs) })))
  }, [inputs, refs, setOutputs])

  return { sectionCost: costs.sectionCost, tabCost: costs.tabCost }
}

type SectionsProps = {
  sectionDetails: ComKeyRatioData['outputData']
  tabName: string
  outputs: ComOutputState[]
  setOutputs: Dispatch<SetStateAction<ComOutputState[]>>
  buildingHeight: unknown
  category?: string
  sectionCost: Record<string, number>
  importedOutputs?: ComOutputState[]
}

const CommercialSections = memo(function CommercialSections({ sectionDetails, tabName, outputs, setOutputs, buildingHeight, category, sectionCost, importedOutputs }: SectionsProps) {
  const costOf = (name: string) => (name === 'Area efficiencies' ? sectionCost?.SaleableAreaMaximization : sectionCost?.[name])
  const label = (name: string, text: string | null, cls: string) =>
    name === 'Area efficiencies' ? (
      <>
        <span className="text-black pr-1 font-semibold">Saleable Area Maximization - </span>
        <span className={cls}>{text}</span>
      </>
    ) : (
      text
    )
  return (
    <div className=" md:h-85 h-100 xl:h-[62dvh]  overflow-y-auto p-1">
      <section className="space-y-3">
        {Object.keys(sectionDetails?.[tabName] || {}).map((name) => {
          const cost = costOf(name) ?? null
          const text = cost !== null ? crore(cost) : null
          const cls = (cost as number) < 0 ? 'text-green-600' : 'text-red-600'
          return (
            <Fragment key={name}>
              <div className="flex justify-between items-center px-2">
                <span className="font-semibold">{name}</span>
                {!isBlankNumber(cost) && (
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end">
                    <HoverInfo trigger={<span className={cls}>₹</span>} message={label(name, text, cls)} className="md:hidden" />
                    <div className={cn('hidden md:flex items-end justify-end typo-basic-2', cls)}>{label(name, text, cls)}</div>
                  </div>
                )}
              </div>
              <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 items-end space-y-2">
                {Object.values(sectionDetails[tabName]?.[name] ?? {}).map(
                  (f) =>
                    !!f?.is_visible && (
                      <CommercialRatioBox
                        key={f?.field_id}
                        id={f?.field_id}
                        label={f?.field_name}
                        fields={f}
                        setCalculatedSectionValues={setOutputs}
                        calculatedSectionValues={outputs}
                        buildingHeight={buildingHeight}
                        category={category}
                        dynamicRange={[17, 18].includes(f?.field_id) ? null : commercialDynamicRange(f, category)}
                        importedOutputs={importedOutputs}
                      />
                    ),
                )}
              </div>
            </Fragment>
          )
        })}
      </section>
    </div>
  )
})

type Props = {
  keyRatioData?: ComKeyRatioData
  category?: string
  keyRatioFormData: ComInput[]
  calculatedSectionValues: ComOutputState[]
  setCalculatedSectionValues: Dispatch<SetStateAction<ComOutputState[]>>
  keyRatioDataRef: ComRef[]
  onCosts?: (c: CommercialCostState) => void
  importedOutputs?: ComOutputState[]
}

function CommercialRatios({ keyRatioData, category, keyRatioFormData, calculatedSectionValues, setCalculatedSectionValues, keyRatioDataRef, onCosts, importedOutputs }: Props) {
  const height = inputValue(keyRatioFormData, 41)
  const [params, setParams] = useSearchParams()
  const [active, setActive] = useState(params.get('tab') || 'Design')
  const { tabCost, sectionCost } = useCommercialCosts({ inputs: keyRatioFormData, outputs: calculatedSectionValues, setOutputs: setCalculatedSectionValues, refs: keyRatioDataRef, category })
  useEffect(() => onCosts?.({ tabCost, sectionCost }), [tabCost, sectionCost, onCosts])

  const tabTotal = (t: string) => (t === 'Design' ? tabCost?.[t] + sectionCost?.Saleable_GC_Maximization + sectionCost?.SaleableAreaMaximization : tabCost?.[t])
  const tabs = Object.keys(keyRatioData?.outputData ?? {})
  const owner = keyRatioData?.owner as Record<string, string | null | undefined> | undefined

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
            <div key={t} className="flex items-center gap-1 mt-5 sm:mt-0">
              <TabsTrigger
                value={t}
                className={cn(
                  'max-w-25 cursor-pointer text-black border-0 border-b-3 rounded-none shadow-none data-[state=active]:shadow-none data-[state=active]:text-blue-900',
                  active === t && 'border-blue-900 ',
                )}
              >
                {t}
              </TabsTrigger>
              {owner?.[t.toLowerCase() + '_owner'] && <HoverInfo trigger={<Eye width={20} color="black" />} message={owner[t.toLowerCase() + '_owner']} className="cursor-pointer" />}
            </div>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <motion.div key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <CommercialSections
                sectionDetails={keyRatioData!.outputData}
                tabName={t}
                setOutputs={setCalculatedSectionValues}
                outputs={calculatedSectionValues}
                buildingHeight={height}
                category={category}
                sectionCost={sectionCost}
                importedOutputs={importedOutputs}
              />
              <div className="absolute right-3 top-0">
                <Badge variant="secondary" className={cn(!Math.round(tabTotal(active)) && 'hidden', 'typo-basic-2', active !== t && 'hidden ')}>
                  {crore(Math.round(tabTotal(active)))}
                </Badge>
              </div>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default memo(CommercialRatios)
