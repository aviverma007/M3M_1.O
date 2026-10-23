/**
 * Residential Key Ratio page body (original `goe`).
 * GET /keyRatio?project_id -> inputs (left) + calculated ratios (right); Save & Next -> POST|PUT /keyRatio,
 * PUT /project/:id/save-project-module, back to the modules grid.
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
import { getKeyRatio, saveKeyRatio, saveKeyRatioDraft, saveProjectModuleData } from '@/api/keyratio-compare'
import type { Project } from '@/types'
import type { KeyCalFields, KeyRatioForm, ResidentialKeyRatio as KeyRatioData } from '@/types/keyratio-compare'
import { ResidentialInputs } from './InputPanels'
import ResidentialRatios from './ResidentialRatios'
import KeyRatioHeader from './KeyRatioHeader'
import type { RemarkFlagMap } from './RatioBox'

type ImportResult = { keyCalFields?: KeyCalFields; KeyRatioFields?: KeyRatioForm }

/** Merge imported ratio values/flags/remarks into the loaded key ratio data, position by position (original `moe`). */
function mergeImported(data: Partial<KeyRatioData>, imported: ImportResult): Partial<KeyRatioData> {
  if (!imported?.keyCalFields) return data
  const next = { ...data, keyCalFields: { ...data.keyCalFields } }
  Object.keys(imported.keyCalFields).forEach((tab) => {
    next.keyCalFields[tab] = { ...next.keyCalFields[tab] }
    Object.keys(imported.keyCalFields![tab]).forEach((section) => {
      const old = next.keyCalFields[tab][section] || []
      next.keyCalFields[tab][section] = imported.keyCalFields![tab][section].map((c, i) =>
        old[i] ? { ...old[i], value: c.value, is_flag: c.is_flag, remark: c.remark } : c,
      )
    })
  })
  return next
}

export default function ResidentialKeyRatio({ project }: { project: Project }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { projectId, moduleId } = useParams()
  const storageKey = `keyRatioRemarksFlags_${projectId}_${moduleId}`

  const [category, setCategory] = useState('')
  const [remarksFlags, setRemarksFlags] = useState<RemarkFlagMap>({})
  const [importing, setImporting] = useState(false)
  const [fieldCost, setFieldCost] = useState<Record<number, number>>({})
  const [keyRatioData, setKeyRatioData] = useState<Partial<KeyRatioData>>({})
  const [form, setForm] = useState<KeyRatioForm>({})
  const [sectionValues, setSectionValues] = useState<{ section_id: number; section_cost: string }[]>([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lastLoaded = useRef<string>('')

  // payload sent on save / save-as-draft (original `hoe`)
  const payload = useMemo(
    () => ({
      ...form,
      ...(projectId && { project_id: parseInt(projectId, 10) }),
      ...(moduleId && { module_id: parseInt(moduleId, 10) }),
      inputValues: Object.values(remarksFlags).map((g) => ({
        field_id: g?.field_id,
        field_value: g?.field_value,
        remark: g?.remark || '',
        flag: g?.flag ? 1 : 0,
        calculated_cost: fieldCost[g?.field_id],
      })),
      calculatedSectionValues: sectionValues,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remarksFlags, form],
  )

  useEffect(() => {
    const clear = () => {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        /* ignore */
      }
    }
    clear()
    setLoading(true)
    getKeyRatio(projectId)
      .then((data) => {
        const json = JSON.stringify(data)
        if (json !== lastLoaded.current) {
          lastLoaded.current = json
          setKeyRatioData(data)
          setForm(data?.keyRatioFields?.[0] ?? {})
        }
        setCategory(project?.category?.replace('-', '_') ?? '')
      })
      .catch((e) => console.error('Error fetching data:', e))
      .finally(() => setLoading(false))
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setSaving(true)
      try {
        await saveKeyRatio(payload)
        await saveProjectModuleData(projectId, { moduleId: Number(moduleId) })
        localStorage.removeItem(storageKey)
        qc.invalidateQueries({ queryKey: ['projects'] })
        navigate(`/dashboard/project/${projectId}/modules`)
        toast.success('KeyRatio Module created')
      } catch (err) {
        console.error('Error in API calls:', err)
        toast.error((err as Error)?.message)
      } finally {
        setSaving(false)
      }
    },
    [payload, projectId, moduleId, navigate, qc, storageKey],
  )

  const upload = async () => {
    try {
      setImporting(true)
      const fd = new FormData()
      if (importFile) fd.append('file', importFile)
      const res = await importModuleCsv({ file: fd, projectId, moduleId })
      const imported = (res?.data ?? {}) as ImportResult
      setKeyRatioData((prev) => mergeImported(prev, imported))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, project_id, module_id, createdAt, updatedAt, value, is_flag, remark, ...rest } = imported?.KeyRatioFields || {}
      setForm((prev) => ({ ...prev, ...rest }))
      toast.success('Project imported successfully')
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Failed to import project')
    } finally {
      setImportOpen(false)
      setImporting(false)
      setImportFile(null)
    }
  }

  return (
    <div className="w-full overflow-auto space-y-4 ">
      <KeyRatioHeader
        importFile={importFile}
        setImportFile={setImportFile}
        onUpload={upload}
        importing={importing}
        importOpen={importOpen}
        setImportOpen={setImportOpen}
        onSaveDraft={() => saveKeyRatioDraft(payload)}
      />
      <div className={cn(' py-2 w-full rounded-md relative')}>
        {loading ? (
          <div className="min-h-[calc(100dvh_-_300px)]">
            <SmallLoader />
          </div>
        ) : (
          <div className={cn('w-full  overflow-x-auto')}>
            <form onSubmit={submit} className="flex flex-col gap-2">
              <div className="grid sm:grid-cols-12 grid-cols-1 gap-4 m-auto grow py-2 sm:bg-white bg-transparent rounded-md 2xl:w-full xl:min-w-full">
                <div className="sm:col-span-3  w-full bg-white rounded-md">
                  <ResidentialInputs keyRatioFormData={form} setKeyRatioFormData={setForm} />
                </div>
                <div className="sm:col-span-9  w-full  border-l-1 border-gray-300">
                  <ResidentialRatios
                    keyRatioFormData={form}
                    calculatedRatios={keyRatioData?.keyCalFields}
                    keyRatioData={keyRatioData}
                    category={category}
                    setKeyRatioRemarksFlags={setRemarksFlags}
                    setCalculatedSectionValues={setSectionValues}
                    setKeyRatioFormData={setForm}
                    fieldCostCalculation={fieldCost}
                    setFieldCostCalculation={setFieldCost}
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
