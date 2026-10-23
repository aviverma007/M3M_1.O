/** Left "Enter Details" panels: residential (original noe/roe) and commercial (original LG). */
import { memo, useCallback, type Dispatch, type SetStateAction } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/module-workspace/accordion'
import type { ComKeyRatioData, KeyRatioForm } from '@/types/keyratio-compare'
import { HIDDEN_INPUT_KEYS, INPUT_SECTION, INPUT_SECTION_ORDER, inputLabel, inputUnit, type ComInput } from './calc'
import { NumberField, type NumberFieldChange } from './parts'

const LIST_CLS = 'grid grid-cols-1 gap-2 md:h-85 h-100 xl:h-[62dvh] overflow-y-auto overflow-x-clip p-1 items-center'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Accordion type="single" collapsible defaultValue={title}>
      <AccordionItem value={title}>
        <AccordionTrigger className=" hover:no-underline cursor-pointer py-1.5 " arrowDown>
          {title}
        </AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

type ResProps = { keyRatioFormData: KeyRatioForm; setKeyRatioFormData: Dispatch<SetStateAction<KeyRatioForm>> }

function ResidentialInputsBase({ keyRatioFormData, setKeyRatioFormData }: ResProps) {
  const onChange = (e: NumberFieldChange) => {
    const { name, value } = e.target
    setKeyRatioFormData((prev) => ({ ...prev, [name]: value === '' ? null : value }))
  }
  const groups: Record<string, string[]> = {}
  Object.keys(keyRatioFormData || {}).forEach((k) => {
    if (HIDDEN_INPUT_KEYS.has(k)) return
    ;(groups[INPUT_SECTION[k] || 'Other'] ??= []).push(k)
  })
  return (
    <div className="space-y-2 pl-2">
      <h1 className="text-xl border-b-1 p-2 pt-2 text-blue-900">Enter Details</h1>
      <div className={LIST_CLS}>
        {Object.entries(groups)
          .sort(([a], [b]) => (INPUT_SECTION_ORDER[a] ?? 0) - (INPUT_SECTION_ORDER[b] ?? 0))
          .map(([section, keys]) => (
            <Group key={section} title={section}>
              {keys.map((k, i) => (
                <NumberField
                  key={`${k}-${i}`}
                  id={k}
                  name={k}
                  onChange={onChange}
                  value={keyRatioFormData[k] ?? ''}
                  placeholder={`Enter ${inputLabel(k)}`}
                  label={inputLabel(k)}
                  fieldUnit={inputUnit(k.trim()) ?? ''}
                  type="number"
                  required
                />
              ))}
            </Group>
          ))}
      </div>
    </div>
  )
}
export const ResidentialInputs = memo(ResidentialInputsBase)

type ComProps = { inputData?: ComKeyRatioData['inputData']; keyRatioFormData: ComInput[]; setKeyRatioFormData: Dispatch<SetStateAction<ComInput[]>> }

/** Upsert {field_id, value} into the commercial inputs list. */
export function upsertInput(list: ComInput[], fieldId: number, value: string) {
  const i = list.findIndex((x) => x.field_id === fieldId)
  if (i === -1) return [...list, { field_id: fieldId, value }]
  const next = [...list]
  next[i] = { field_id: fieldId, value }
  return next
}

function CommercialInputsBase({ inputData, keyRatioFormData, setKeyRatioFormData }: ComProps) {
  const onChange = useCallback(
    (e: NumberFieldChange) => {
      const { name, value } = e.target
      setKeyRatioFormData((prev) => upsertInput(prev, Number(name), value))
    },
    [setKeyRatioFormData],
  )
  return (
    <div className="space-y-2 pl-2">
      <h1 className="text-xl border-b-1 p-2 pt-2 text-blue-900"> Enter Details </h1>
      <div className="grid grid-cols-1 gap-2 overflow-x-clip md:h-85 h-100 xl:h-[62dvh] overflow-y-auto  p-1 items-center">
        {Object.entries(inputData || {}).map(([tab, sections]) =>
          Object.entries(sections).map(([section, fields]) => (
            <Group key={`${tab}-${section}`} title={section}>
              {fields.map(
                (f, i) =>
                  !!f?.is_visible && (
                    <NumberField
                      key={`${f.field_id}-${i}`}
                      id={f.field_id}
                      name={f.field_id}
                      onChange={onChange}
                      value={(keyRatioFormData.find((m) => m.field_id === f.field_id)?.value as string) || ''}
                      placeholder={`Enter ${f?.field_name}`}
                      label={f?.field_name}
                      fieldUnit={f?.units || ''}
                      type="number"
                      required
                    />
                  ),
              )}
            </Group>
          )),
        )}
      </div>
    </div>
  )
}
export const CommercialInputs = memo(CommercialInputsBase)
