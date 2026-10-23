/**
 * Commercial key ratio comparison (original `sn` + `De` + `Pe`). Inputs table (current editable) and
 * output tabs; Save & Next saves the current project as draft (PUT /commercial/save-as-draft).
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { LoadingButton } from '@/components/common'
import { cn } from '@/lib/utils'
import { saveCommercialDraft } from '@/api/keyratio-compare'
import type { ComOutputField, CompareProject } from '@/types/keyratio-compare'
import { commercialDynamicRange, inputValue, type ComInput, type ComOutputState, type ComRef } from '../calc'
import { NumberField, type NumberFieldChange } from '../parts'
import { upsertInput } from '../InputPanels'
import CommercialRatioBox from '../CommercialRatioBox'
import { useCommercialCosts } from '../CommercialRatios'
import { commonValues, flatInputs } from './similarity'

type Props = { currentProjectData: Partial<CompareProject>; compareProjectsData: CompareProject[]; isEntryenable: boolean; hideEntry: boolean }

export default function CommercialCompare({ currentProjectData: e, compareProjectsData: list, isEntryenable, hideEntry }: Props) {
  const navigate = useNavigate()
  const { projectId, moduleId } = useParams()
  const [inputs, setInputs] = useState<ComInput[]>([])
  const [outputs, setOutputs] = useState<ComOutputState[]>([])
  const [saving, setSaving] = useState(false)
  const refs = useRef<ComRef[]>([])

  useEffect(() => {
    refs.current = []
    if (!e?.id) return
    const ins: ComInput[] = []
    const outs: ComOutputState[] = []
    const r: ComRef[] = []
    Object.values(e?.inputData || {}).forEach((s) => Object.values(s || {}).forEach((rows) => rows?.forEach((f) => ins.push({ field_id: f?.field_id, value: f?.value }))))
    Object.entries(e?.outputData ?? {}).forEach(([tab, secs]) =>
      Object.entries(secs).forEach(([sec, rows]) =>
        rows.forEach((l) => {
          outs.push({ field_id: l?.field_id, field_value: l?.field_value, remark: l?.remark, is_flag: l?.is_flag })
          r.push({ id: l?.id, field_id: l?.field_id, dependency: l?.dependency, sectionName: sec, tabName: tab })
        }),
      ),
    )
    setInputs(ins)
    setOutputs(outs)
    refs.current = r
    return () => {
      refs.current = []
      setOutputs([])
      setInputs([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const body = useMemo(() => ({ projectId, keyRatioInputs: inputs, keyOutputs: outputs }), [projectId, inputs, outputs])
  const submit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault()
      setSaving(true)
      try {
        const t = await saveCommercialDraft(body)
        if (t?.success) {
          navigate(`/dashboard/project/${projectId}/modules/${moduleId}/keyratio`)
          toast.success(t?.message ?? 'Project saved as draft')
        }
      } catch (err) {
        console.error('Error in API calls:', err)
        toast.error((err as Error)?.message ?? 'There was an error processing your request.')
      } finally {
        setSaving(false)
      }
    },
    [body, projectId, moduleId, navigate],
  )
  const goBack = (ev: MouseEvent) => {
    ev.preventDefault()
    navigate(-1)
  }

  return (
    <div className="overflow-hidden ">
      <div className={cn(' py-1 w-full m-auto rounded-md')}>
        <div className={cn(' w-full overflow-x-auto')}>
          <form onSubmit={submit}>
            <div className="grid md:grid-cols-12 grid-cols-1 gap-4 m-auto py-2">
              <div className="md:col-span-4 col-span-full p-2 rounded-md overflow-y-auto compareTableheight bg-white">
                <Table className="table-auto ">
                  <TableHeader>
                    <TableRow className="p-0 border-none">
                      <TableHead className="text-lg whitespace-normal text-[#000] min-w-30 p-0 pl-2 typo-tableHead">Parameters</TableHead>
                      {e?.id && (
                        <TableHead className="text-[#404040] text-center p-0 pl-2 typo-tableHead">
                          <span>{e?.name}</span>
                        </TableHead>
                      )}
                      {list?.map(({ name, id }) => (
                        <TableHead key={id} className="text-[#404040] text-center p-0 pl-2 typo-tableHead">
                          <span>{name}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <InputRows projects={list} current={e} isEntryenable={isEntryenable} hideEntry={hideEntry} inputs={inputs} setInputs={setInputs} />
                  </TableBody>
                </Table>
              </div>
              <div className="md:col-span-8 col-span-full bg-white p-2 rounded-md overflow-y-auto compareTableheight">
                <OutputTabs projects={list} current={e} isEntryenable={isEntryenable} hideEntry={hideEntry} inputs={inputs} outputs={outputs} setOutputs={setOutputs} refs={refs.current} />
              </div>
            </div>
            {projectId && (
              <div className="flex justify-end gap-2 z-50">
                <Button onClick={goBack} variant="outline" className="border-blue-900 border-1 cursor-pointer">
                  Go Back
                </Button>
                <LoadingButton type="submit" variant="btnBlue" title="Save & Next" loading={saving} />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

type RowsProps = {
  projects: CompareProject[]
  current: Partial<CompareProject>
  isEntryenable: boolean
  hideEntry: boolean
  inputs: ComInput[]
  setInputs: React.Dispatch<React.SetStateAction<ComInput[]>>
}

/** Input rows (original `De`). */
function InputRows({ projects: e, current: i, isEntryenable: h, hideEntry: _, inputs, setInputs }: RowsProps) {
  const common = useMemo(() => commonValues(e, (p) => flatInputs(p.inputData), (f) => f?.value), [e])
  if (!Array.isArray(e) || e.length === 0) return null
  const onChange = (ev: NumberFieldChange) => setInputs((prev) => upsertInput(prev, Number(ev.target.name), ev.target.value))
  const rows: React.ReactNode[] = []
  Object.entries(e[0]?.inputData || {}).forEach(([tab, secs]) =>
    Object.entries(secs || {}).forEach(([sec, fields]) =>
      fields?.forEach((n) => {
        const same = !!common.get(n.field_id)
        rows.push(
          <TableRow key={n.field_id} className={cn('border-none pt-2 p-0', h && same && 'bg-stone-200 hover:bg-stone-200 opacity-50', _ && same && 'hidden')}>
            <TableCell className="capitalize whitespace-normal pt-2 px-0 pb-0 ">
              <div className="pl-2 text-xs font-semibold ">{n?.field_name.replaceAll('_', ' ')}</div>
            </TableCell>
            {i?.id && (
              <TableCell className="pt-2 px-0 pb-0">
                <NumberField
                  name={n.field_id}
                  value={(inputs.find((m) => m.field_id === n.field_id)?.value as string) || ''}
                  placeholder={`Enter ${n?.field_name.replaceAll('_', ' ')}`}
                  onChange={onChange}
                  fieldUnit={n?.units || ''}
                  type="number"
                  required
                />
              </TableCell>
            )}
            {e.map((m, E) => {
              const a = m?.inputData?.[tab]?.[sec]?.find((b) => b.field_id === n?.field_id)
              return (
                <TableCell key={E} className="pt-2 px-0 pb-0">
                  <NumberField
                    disabled
                    name={a?.field_name}
                    value={(a?.value as string) || ''}
                    placeholder={`Enter ${a?.field_name?.replaceAll('_', ' ') || ''}`}
                    fieldUnit={a?.units || ''}
                    type="number"
                    required
                  />
                </TableCell>
              )
            })}
          </TableRow>,
        )
      }),
    ),
  )
  return <>{rows}</>
}

type OutProps = Omit<RowsProps, 'setInputs'> & {
  outputs: ComOutputState[]
  setOutputs: React.Dispatch<React.SetStateAction<ComOutputState[]>>
  refs: ComRef[]
}

/** Output tabs (original `Pe`). */
function OutputTabs({ projects: e, current: i, isEntryenable: h, hideEntry: _, inputs, outputs, setOutputs, refs }: OutProps) {
  useCommercialCosts({ inputs, outputs, setOutputs, refs })
  const [active, setActive] = useState('Design')
  const common = useMemo(
    () => commonValues(e, (p) => Object.values(p.outputData ?? {}).flatMap((s) => Object.values(s ?? {}).flat()) as ComOutputField[], (f) => f?.field_value),
    [e],
  )
  if (!Array.isArray(e) || e.length === 0) return null
  const o = e[0]?.outputData
  const tabs = Object.keys(o || {})
  const height = inputValue(inputs, 41)
  return (
    <Tabs defaultValue={tabs[0]} className="w-full p-1 bg-white rounded-md overflow-clip">
      <TabsList className="gap-2 bg-white">
        {tabs.map((n) => (
          <TabsTrigger
            key={n}
            value={n}
            className={cn(
              'max-w-25 cursor-pointer text-black border-0 border-b-3 rounded-none shadow-none data-[state=active]:shadow-none data-[state=active]:text-blue-900',
              active === n && 'border-blue-900 ',
            )}
            onClick={() => setActive(n)}
          >
            {n}
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.entries(o || {}).map(([n, t]) => (
        <TabsContent key={n} value={n} className="overflow-x-auto">
          <Table className="table-auto">
            <TableHeader>
              <TableRow className="border-none text-md h-10 truncate text-black hover:bg-white">
                <TableHead className="text-black pt-2 px-1 pb-0">Ratios</TableHead>
                {i?.id && (
                  <TableHead className="text-[#404040] pt-2 px-0 pb-0">
                    <span className="inline-flex items-center">
                      <span>{i?.name}</span>
                    </span>
                  </TableHead>
                )}
                {e?.map((d, m) => (
                  <TableHead key={m} className="text-[#404040] pt-2 px-1 pb-0">
                    <span className="inline-flex items-center">
                      <span>{d?.name}</span>
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(t || {}).map(([d, m]) => (
                <Fragment key={d}>
                  <TableRow className="border-b-2 border-gray-300 lg:text-lg text-sm hover:bg-white">
                    <TableCell colSpan={e.length + 1} className="pt-2 px-0 pb-0 font-semibold">
                      {d}
                    </TableCell>
                  </TableRow>
                  {m?.map((E, a) => {
                    const u = i?.outputData?.[n]?.[d]?.find((b) => b.field_id === E?.field_id)
                    const same = !!common.get(E.field_id)
                    return (
                      <TableRow key={`${d}-${a}`} className={cn(h && same && 'bg-stone-200 hover:bg-stone-200 opacity-50', _ && same && 'hidden')}>
                        <TableCell className="capitalize whitespace-normal pt-2 px-1 pb-0 max-w-30">
                          <div className="pl-2 typo-basic-2">{E.field_name}</div>
                        </TableCell>
                        {i?.id && (
                          <TableCell className="pt-2 px-1 pb-0 min-w-30">
                            <CommercialRatioBox
                              id={u?.field_id as number}
                              fields={u}
                              setCalculatedSectionValues={setOutputs}
                              calculatedSectionValues={outputs}
                              buildingHeight={height}
                              category={i?.category}
                              dynamicRange={commercialDynamicRange(u, i?.category)}
                            />
                          </TableCell>
                        )}
                        {e.map((b, $) => {
                          const w = b?.outputData?.[n]?.[d]?.find((M) => M.field_id === E?.field_id)
                          const H = flatInputs(b?.inputData).find((Q) => Q.field_id === 41)
                          return (
                            <TableCell key={$} className="pt-2 px-1 pb-0 min-w-30">
                              <CommercialRatioBox
                                id={w?.field_id as number}
                                fields={w}
                                setCalculatedSectionValues={setOutputs}
                                calculatedSectionValues={outputs}
                                buildingHeight={H?.value}
                                category={b?.category}
                                disabled
                                dynamicRange={commercialDynamicRange(w, b?.category)}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      ))}
    </Tabs>
  )
}
