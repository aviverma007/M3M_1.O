/**
 * Residential key ratio comparison (original `Xe` + `je`): editable inputs of the current project next to the
 * compared projects' inputs, and Design/Structure/MEP ratio tables. Save & Next saves the current project as draft.
 */
import { Fragment, useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type MouseEvent, type SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data'
import { LoadingButton } from '@/components/common'
import { cn } from '@/lib/utils'
import { saveKeyRatioDraft } from '@/api/keyratio-compare'
import type { CompareProject, KeyRatioForm } from '@/types/keyratio-compare'
import { HIDDEN_INPUT_KEYS, heightRange, inputUnit, residentialDynamicRange, residentialValue } from '../calc'
import { NumberField, type NumberFieldChange } from '../parts'
import RatioBox, { type RemarkFlagMap } from '../RatioBox'
import { sameInput, sameRatio } from './similarity'

type Props = { currentProjectData: Partial<CompareProject>; compareProjectsData: CompareProject[]; isEntryenable: boolean; hideEntry: boolean }

const catOf = (c?: string) => (c == 'mid-end' ? 'mid_end' : (c as string))

export default function ResidentialCompare({ currentProjectData: cur, compareProjectsData: list, isEntryenable, hideEntry }: Props) {
  const navigate = useNavigate()
  const { projectId, moduleId } = useParams()
  const [calc, setCalc] = useState<Record<number, number | null>>({})
  const [flags, setFlags] = useState<RemarkFlagMap>({})
  const [form, setForm] = useState<KeyRatioForm>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(cur?.keyRatioFields?.[0] ?? {}), [cur])

  const keys = useMemo(() => {
    const own = Object.keys(cur?.keyRatioFields?.[0] || {})
    const other = (Array.isArray(list) ? list : []).flatMap((p) => Object.keys(p?.keyRatioFields?.[0] || {}))
    return Array.from(new Set([...own, ...other].filter((k) => !HIDDEN_INPUT_KEYS.has(k))))
  }, [cur, list])

  // recalc the current project's ratios when its inputs change
  useEffect(() => {
    if (!form) return
    const nextCalc: Record<number, number | null> = {}
    const nextFlags: RemarkFlagMap = {}
    Object.values(cur?.keyCalFields || {}).forEach((secs) =>
      Object.values(secs).forEach((fields) =>
        fields.forEach((u) => {
          const v = residentialValue(u, form, 'dependency_fields')
          nextCalc[u.id] = v
          nextFlags[u.id] = { field_id: u.id, field_value: v, remark: u?.remark as string, flag: u?.is_flag }
        }),
      ),
    )
    setCalc((p) => ({ ...p, ...nextCalc }))
    setFlags((p) => ({ ...p, ...nextFlags }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const payload = useMemo(() => ({ ...form, inputValues: Object.values(flags).filter((f) => f.field_id !== undefined) }), [form, flags])

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setSaving(true)
      try {
        const res = await saveKeyRatioDraft(payload)
        if (res?.success) {
          navigate(`/dashboard/project/${projectId}/modules/${moduleId}/keyratio`)
          toast.success('Project saved as draft')
        }
      } catch (err) {
        console.error('Error in API calls:', err)
        toast.error('There was an error processing your request.')
      } finally {
        setSaving(false)
      }
    },
    [payload, navigate, projectId, moduleId],
  )

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }

  const onChange = (e: NumberFieldChange) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  return (
    <div className="2xl:container  m-auto overflow-hidden ">
      <div className={cn(' py-1 w-full m-auto rounded-md overflow-hidden')}>
        <div className={cn(' w-full overflow-x-auto')}>
          <form onSubmit={submit}>
            <div className="grid md:grid-cols-12 grid-cols-1 gap-4 m-auto py-2">
              <div className="md:col-span-4 col-span-full p-2 rounded-md overflow-y-auto compareTableheight bg-white">
                <Table className="table-auto ">
                  <TableHeader>
                    <TableRow className="p-0 border-none">
                      <TableHead className="text-lg whitespace-normal text-[#000] min-w-30 p-0 typo-tableHead">Parameters</TableHead>
                      {cur?.id && (
                        <TableHead className="text-[#404040] text-center p-0 typo-tableHead">
                          <span>{cur?.name}</span>
                        </TableHead>
                      )}
                      {list?.map(({ name, id }) => (
                        <TableHead key={id} className="text-[#404040] text-center p-0 typo-tableHead">
                          <span>{name}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k, i) => {
                      const same = sameInput(k, list)
                      return (
                        <Fragment key={k}>
                          <TableRow className={cn('border-none pt-2  p-0', isEntryenable && same && 'bg-stone-200 hover:bg-stone-200 opacity-50', hideEntry && same && 'hidden')}>
                            <TableCell className="capitalize whitespace-normal pt-2 px-0 pb-0">
                              <div className="pl-2 typo-basic-2">{k.replaceAll('_', ' ')}</div>
                            </TableCell>
                            {cur?.id && (
                              <TableCell className="pt-2 px-0 pb-0">
                                <NumberField id={k} name={k} value={(form?.[k] as string) || ''} placeholder={`Enter ${k.replaceAll('_', ' ')}`} fieldUnit={inputUnit(k) || 'sq m'} type="number" required onChange={onChange} />
                              </TableCell>
                            )}
                            {list?.map((p, j) => (
                              <TableCell key={p?.id} className="pt-2 px-0 pb-0">
                                <NumberField
                                  id={`${k}-${j}`}
                                  name={`${k}-${j}`}
                                  value={(p?.keyRatioFields?.[0]?.[k] as string) || ''}
                                  placeholder={`Enter ${k.replaceAll('_', ' ')}`}
                                  fieldUnit={inputUnit(k) || 'sq m'}
                                  type="number"
                                  required
                                  disabled
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                          {i !== keys.length - 1 && (
                            <TableRow className="border-none">
                              <TableCell colSpan={list.length + 2} className="h-1 p-0 " />
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="md:col-span-8 col-span-full bg-white p-2 rounded-md overflow-y-auto compareTableheight ">
                <RatioTables projects={list} current={cur} form={form} setFlags={setFlags} calc={calc} isEntryenable={isEntryenable} hideEntry={hideEntry} />
              </div>
            </div>
            {projectId && (
              <div className="flex justify-end gap-2">
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

type TablesProps = {
  projects: CompareProject[]
  current: Partial<CompareProject>
  form: KeyRatioForm
  setFlags: Dispatch<SetStateAction<RemarkFlagMap>>
  calc: Record<number, number | null>
  isEntryenable: boolean
  hideEntry: boolean
}

/** Ratio tables per tab (original `je`). */
function RatioTables({ projects, current: i, form, setFlags, calc, isEntryenable, hideEntry }: TablesProps) {
  const tabs = Object.keys(projects[0]?.keyCalFields || {})
  const [active, setActive] = useState('Design')
  return (
    <Tabs defaultValue="Design" className="w-full p-1 bg-white rounded-md overflow-clip">
      <TabsList className="gap-2 bg-white">
        {tabs.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <TabsTrigger
              value={t}
              className={cn(
                'max-w-25 cursor-pointer text-black border-0 border-b-3 rounded-none shadow-none data-[state=active]:shadow-none data-[state=active]:text-blue-900',
                active === t && 'border-blue-900 ',
              )}
              onClick={() => setActive(t)}
            >
              {t}
            </TabsTrigger>
          </div>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t} value={t} className="overflow-x-auto">
          <motion.div key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Table className="table-auto">
              <TableHeader>
                <TableRow className="border-none text-md h-10 truncate text-black hover:bg-white">
                  <TableHead className="text-black pt-2 px-0 pb-0">Ratios</TableHead>
                  {i?.id && (
                    <TableHead className="text-[#404040] pt-2 px-0 pb-0">
                      <span className="inline-flex items-center">
                        <span>{i?.name}</span>
                      </span>
                    </TableHead>
                  )}
                  {projects.map((g, s) => (
                    <TableHead key={s} className="text-[#404040] pt-2 px-0 pb-0">
                      <span className="inline-flex items-center">
                        <span>{g?.name}</span>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(projects[0]?.keyCalFields?.[t] || {}).map(([section, fields]) => {
                  const own = new Map(i?.keyCalFields?.[t]?.[section]?.map((l) => [l.id, l]))
                  return (
                    <Fragment key={section}>
                      <TableRow className="border-b-2 border-gray-300 lg:text-lg text-sm hover:bg-white">
                        <TableCell colSpan={projects.length + 1} className="pt-2 px-0 pb-0 font-semibold ">
                          {section}
                        </TableCell>
                      </TableRow>
                      {fields.map((m) => {
                        const a = own.get(m.id)
                        const cat = catOf(i?.category)
                        const range = a?.id === 18 || a?.id === 17 ? heightRange(a?.id, cat, form.building_height) : (a?.[cat] as string | undefined)
                        const same = sameRatio(projects, m.id, t, section)
                        return (
                          <Fragment key={m.id}>
                            <TableRow className={cn('border-none', isEntryenable && same && 'bg-stone-200 hover:bg-stone-200 opacity-50', hideEntry && same && 'hidden')}>
                              <TableCell className="capitalize whitespace-normal pt-2 px-1 pb-0">
                                <div className="pl-2 typo-basic-2">{m.field_name}</div>
                              </TableCell>
                              {i?.id && (
                                <TableCell className="pt-2 px-1 pb-0">
                                  <RatioBox
                                    id={a?.id as number}
                                    labelValue={calc?.[a?.id as number]}
                                    range={range ?? ''}
                                    filledIsFlagged={a?.is_flag}
                                    filledRemark={a?.remark}
                                    setKeyRatioRemarksFlags={setFlags}
                                    dynamicRange={residentialDynamicRange(a, i?.category)}
                                    buildingHeight={form.building_height}
                                  />
                                </TableCell>
                              )}
                              {projects.map((l, R) => {
                                const b = l.keyCalFields?.[t]?.[section]?.find((x) => x?.id === m?.id)
                                return (
                                  <TableCell key={R} className="pt-2 px-1 pb-0">
                                    {b ? (
                                      <RatioBox
                                        id={b.id}
                                        checkProjectId={l?.id}
                                        labelValue={b?.value ?? ''}
                                        range={(b?.[catOf(l?.category)] as string) ?? ''}
                                        filledIsFlagged={b?.is_flag}
                                        filledRemark={b?.remark}
                                        disabled
                                        setKeyRatioRemarksFlags={setFlags}
                                        similer={isEntryenable && same}
                                        dynamicRange={residentialDynamicRange(b, l?.category)}
                                        buildingHeight={l?.keyRatioFields?.[0]?.building_height}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                            <TableRow className="h-1 p-0">
                              <TableCell colSpan={projects.length + (i?.id ? 2 : 1)} className="p-0" />
                            </TableRow>
                          </Fragment>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
