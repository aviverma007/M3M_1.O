/**
 * Commercial Key Ratio page body (original `Qae`).
 * GET /commercial/create-key-ratio?project_id -> inputData (left) / outputData (right);
 * Save & Next -> POST|PUT /commercial/create-key-ratio, PUT /project/:id/save-project-module, back to modules.
 * Compare Project saves as draft first (PUT /commercial/save-as-draft).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/common'
import { SmallLoader } from '@/components/common/PageLoader'
import { cn } from '@/lib/utils'
import { importModuleCsv } from '@/api/module-workspace'
import { getCommercialKeyRatio, saveCommercialDraft, saveCommercialKeyRatio, saveProjectModuleData, type CommercialSubmit } from '@/api/keyratio-compare'
import type { Project } from '@/types'
import type { ComKeyRatioData } from '@/types/keyratio-compare'
import type { ComInput, ComOutputState, ComRef } from './calc'
import { CommercialInputs } from './InputPanels'
import CommercialRatios, { type CommercialCostState } from './CommercialRatios'
import KeyRatioHeader from './KeyRatioHeader'

type ImportedData = { inputData?: ComKeyRatioData['inputData']; outputData?: ComKeyRatioData['outputData'] }

/** Match imported rows to field ids by field name (original `handleImportData` reducer). */
function mapImported(base: ComKeyRatioData | undefined, imported: ImportedData) {
  const inputs: ComInput[] = []
  const outputs: ComOutputState[] = []
  const find = (rows: { field_name: string; field_id: number }[] | undefined, name?: string) => rows?.find((r) => r.field_name?.toLowerCase() === name?.toLowerCase())
  Object.entries(imported?.inputData ?? {}).forEach(([tab, secs]) =>
    Object.entries(secs ?? {}).forEach(([sec, rows]) =>
      rows?.forEach((r) => {
        const hit = find(base?.inputData?.[tab]?.[sec], r.field_name)
        if (hit?.field_id != null) inputs.push({ field_id: hit.field_id, value: r.value })
      }),
    ),
  )
  Object.entries(imported?.outputData ?? {}).forEach(([tab, secs]) =>
    Object.entries(secs ?? {}).forEach(([sec, rows]) =>
      rows?.forEach((r) => {
        const hit = find(base?.outputData?.[tab]?.[sec], r.field_name)
        if (hit?.field_id != null)
          outputs.push({ field_id: hit.field_id, field_value: r.field_value, remark: r.remark, is_flag: String(r.is_flag ?? '').toLowerCase() === 'true' })
      }),
    ),
  )
  return { inputs, outputs }
}

export default function CommercialKeyRatio({ project }: { project: Project }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { projectId, moduleId } = useParams()
  const [data, setData] = useState<ComKeyRatioData>()
  const [inputs, setInputs] = useState<ComInput[]>([])
  const [outputs, setOutputs] = useState<ComOutputState[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importedOutputs, setImportedOutputs] = useState<ComOutputState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costs, setCosts] = useState<CommercialCostState>({ sectionCost: {}, tabCost: {} })
  const refs = useRef<ComRef[]>([])

  useEffect(() => {
    refs.current = []
    setLoading(true)
    getCommercialKeyRatio(projectId)
      .then((res) => {
        const kd = res?.keyRatioData
        const ins: ComInput[] = []
        const outs: ComOutputState[] = []
        const r: ComRef[] = []
        Object.values(kd?.inputData || {}).forEach((secs) => Object.values(secs || {}).forEach((rows) => rows?.forEach((q) => ins.push({ field_id: q?.field_id, value: q?.value }))))
        Object.entries(kd?.outputData ?? {}).forEach(([tab, secs]) =>
          Object.entries(secs).forEach(([sec, rows]) =>
            rows.forEach((g) => {
              outs.push({ field_id: g?.field_id, field_value: g?.field_value, remark: g?.remark, is_flag: g?.is_flag })
              r.push({
                id: g?.id,
                field_id: g?.field_id,
                dependency: g?.dependency,
                range: g?.[project?.category] as string | undefined,
                dynamicRange: g?.[`${project?.category}_range`] as ComRef['dynamicRange'],
                sectionName: sec,
                tabName: tab,
              })
            }),
          ),
        )
        refs.current = r
        setData(kd)
        setInputs(ins)
        setOutputs(outs)
      })
      .catch((e) => console.error('Error fetching data:', e))
      .finally(() => setLoading(false))
    return () => {
      refs.current = []
      setOutputs([])
      setInputs([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sectionCostPostData = useMemo(() => Object.entries(costs.sectionCost).map(([section_name, section_cost]) => ({ section_name, section_cost })), [costs.sectionCost])
  const body: CommercialSubmit = useMemo(() => ({ projectId, keyRatioInputs: inputs, keyOutputs: outputs, sectionCost: sectionCostPostData }), [projectId, inputs, outputs, sectionCostPostData])

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setSaving(true)
      try {
        const res = await saveCommercialKeyRatio(refs.current?.[0]?.id ?? null, body)
        await saveProjectModuleData(projectId, { moduleId: Number(moduleId) })
        if (res?.success) {
          toast.success(res?.message ?? 'KeyRatio Module created')
          qc.invalidateQueries({ queryKey: ['projects'] })
          navigate(`/dashboard/project/${projectId}/modules`)
        }
      } catch (err) {
        console.error('Error in API calls:', err)
        toast.error((err as Error)?.message)
      } finally {
        setSaving(false)
      }
    },
    [body, projectId, moduleId, navigate, qc],
  )

  const upload = async () => {
    try {
      const fd = new FormData()
      if (importFile) fd.append('file', importFile)
      const res = await importModuleCsv({ file: fd, projectId, moduleId })
      const { inputs: ins, outputs: outs } = mapImported(data, (res?.data ?? {}) as ImportedData)
      if (ins.length) setInputs((prev) => ins.reduce((acc, i) => [...acc.filter((x) => x.field_id !== i.field_id), i], prev))
      setImportedOutputs(outs)
      toast.success('Project imported successfully')
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Failed to import project')
    } finally {
      setImportOpen(false)
      setImportFile(null)
    }
  }

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }

  return (
    <div className="w-full overflow-auto space-y-4 ">
      <KeyRatioHeader
        importFile={importFile}
        setImportFile={setImportFile}
        onUpload={upload}
        importOpen={importOpen}
        setImportOpen={setImportOpen}
        onSaveDraft={() => saveCommercialDraft(body)}
      />
      <div className={cn('py-2 w-full rounded-md relative')}>
        {loading ? (
          <div className="h-60">
            <SmallLoader />
          </div>
        ) : (
          <div className={cn('w-full  overflow-x-auto')}>
            <form onSubmit={submit} className="flex flex-col gap-2">
              <div className="grid sm:grid-cols-12 grid-cols-1 gap-4 m-auto grow py-2 sm:bg-white bg-transparent rounded-md 2xl:w-full xl:min-w-full">
                <div className="sm:col-span-3  w-full bg-white rounded-md">
                  <CommercialInputs inputData={data?.inputData} setKeyRatioFormData={setInputs} keyRatioFormData={inputs} />
                </div>
                <div className="sm:col-span-9  w-full  border-l-1 border-gray-300">
                  <CommercialRatios
                    keyRatioData={data}
                    category={project?.category}
                    keyRatioFormData={inputs}
                    setCalculatedSectionValues={setOutputs}
                    calculatedSectionValues={outputs}
                    keyRatioDataRef={refs.current}
                    onCosts={setCosts}
                    importedOutputs={importedOutputs}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 ">
                <Button onClick={goBack} variant="outline" className="border-blue-900 border-1 cursor-pointer">
                  Go Back
                </Button>
                <LoadingButton type="submit" variant="btnBlue" title="Save & Next" loading={saving} />
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
