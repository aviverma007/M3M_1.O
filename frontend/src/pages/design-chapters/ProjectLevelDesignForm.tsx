/* Project Level Design: /dashboard/project/:projectId/design-chapters/project-level-design (original ProjectLevelDesignForm). */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/common/PageLoader'
import { useBenchmarks } from '@/lib/benchmark'
import { errorMessage, getProject, getProjectOptions, getSummary, saveSummary } from '@/api/chapters-a'
import InputPanel from '@/components/design-chapters/project-level/InputPanel'
import OutputPanel from '@/components/design-chapters/project-level/OutputPanel'
import CompareSection, { type Compared, type ProjectLite } from '@/components/design-chapters/project-level/CompareSection'
import { ADDITIONAL_DEFAULTS, AREA_STATEMENT_DEFAULTS, KEY_RATIO_DEFAULTS, comparisonRatios, newCluster } from '@/components/design-chapters/project-level/calc'
import type { AdditionalElements2, AreaStatementInputs, ClusterConfig, KeyRatioInputs, ParkingReq } from '@/types/chapters-a'

const SCROLLBAR_CSS = `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `

export default function ProjectLevelDesignForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const benchmarks = useBenchmarks()
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [compared, setCompared] = useState<Record<string, Compared>>({})
  const [keyRatio, setKeyRatio] = useState<KeyRatioInputs>(KEY_RATIO_DEFAULTS)
  const [area, setArea] = useState<AreaStatementInputs>(AREA_STATEMENT_DEFAULTS)
  const [extra, setExtra] = useState<AdditionalElements2>(ADDITIONAL_DEFAULTS)
  const [clusters, setClusters] = useState<ClusterConfig[]>([newCluster()])

  useEffect(() => {
    ;(async () => {
      try {
        const p = await getProject(projectId!)
        const farPerm = parseFloat(p?.far_permissible) || 0
        const permSqft = farPerm ? Math.round(farPerm * 10.7639) : null
        const [summary, list] = await Promise.allSettled([getSummary(projectId!), getProjectOptions()])
        if (summary.status === 'fulfilled') {
          const s = summary.value
          const d = s?.projectLevelDesignData
          if (d) {
            if (d.keyRatioInputs) {
              const k = { ...d.keyRatioInputs }
              if (!k.buildingHeight && s?.projectDetailsLayoutData?.towerHeight) k.buildingHeight = s.projectDetailsLayoutData.towerHeight
              if (!k.saleableArea && s?.projectDetailsLayoutData?.grandTotalSaleable) k.saleableArea = String(s.projectDetailsLayoutData.grandTotalSaleable)
              if (permSqft) k.permissibleFAR = String(permSqft)
              setKeyRatio(k)
            }
            if (d.areaStatementInputs) setArea(d.areaStatementInputs)
            if (d.additionalElements2) {
              const h = { ...d.additionalElements2 }
              if (!h.other?.extraParkingReqs?.length) {
                const o = (h.other ?? {}) as Record<string, string>
                const reqs: ParkingReq[] = []
                if (o.parkingReq2BHK) reqs.push({ label: '2 BHK + STUDY', value: o.parkingReq2BHK })
                if (o.parkingReq1BHK) reqs.push({ label: '1 BHK + STUDY', value: o.parkingReq1BHK })
                if (!reqs.length) reqs.push({ label: '2 BHK + STUDY', value: '' }, { label: '1 BHK + STUDY', value: '' })
                h.other = { ...h.other, extraParkingReqs: reqs }
              }
              setExtra(h)
            }
            if (d.clusterConfigs) setClusters(d.clusterConfigs)
            if (d.compareProjectIds) setSelected(d.compareProjectIds)
          }
        } else {
          console.error('Error fetching design brief summary:', summary.reason)
          if (permSqft) setKeyRatio((k) => ({ ...k, permissibleFAR: String(permSqft) }))
        }
        if (list.status === 'fulfilled') setProjects(list.value.filter((x) => String(x.id) !== String(projectId)))
        else console.error('Error fetching projects list:', list.reason)
      } catch (e) {
        console.error('Failed to fetch project data:', e)
        toast.error('Failed to load project details')
      } finally {
        setTimeout(() => setLoading(false), 500)
      }
    })()
  }, [projectId])

  /* load key ratios of newly selected comparison projects */
  useEffect(() => {
    if (selected.length === 0 || projects.length === 0) return
    selected
      .filter((id) => !compared[id])
      .forEach(async (id) => {
        try {
          const d = (await getSummary(id))?.projectLevelDesignData || {}
          const p = projects.find((x) => String(x.id) === String(id))
          setCompared((c) => ({ ...c, [id]: { name: p?.name || String(id), location: p?.location || '', keyRatios: comparisonRatios(d) } }))
        } catch (e) {
          console.error('Failed to fetch comparison project data', id, e)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, projects])

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, {
        projectLevelDesignData: { keyRatioInputs: keyRatio, areaStatementInputs: area, additionalElements2: extra, clusterConfigs: clusters, compareProjectIds: selected },
      })
      toast.success('Project Level Design saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving project level design:', e)
      toast.error(errorMessage(e, 'Failed to save project level design'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-6">
      <div className="max-w-[1500px] mx-auto mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors mb-4">
          <ChevronLeft size={20} />
          <span>Project Level Design</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Project Level Design</h1>
        <p className="text-sm text-gray-500 mt-1">Configure project parameters and view calculations</p>
      </div>

      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <InputPanel
            keyRatio={keyRatio}
            setKeyRatio={setKeyRatio}
            area={area}
            setArea={setArea}
            extra={extra}
            setExtra={setExtra}
            clusters={clusters}
            setClusters={setClusters}
            benchmarks={benchmarks}
          />
        </div>
        <div className="lg:col-span-7 space-y-6">
          <OutputPanel keyRatio={keyRatio} area={area} extra={extra} clusters={clusters} benchmarks={benchmarks} />
        </div>
      </div>

      <CompareSection
        projects={projects}
        selected={selected}
        setSelected={setSelected}
        compared={compared}
        current={comparisonRatios({ keyRatioInputs: keyRatio, additionalElements2: extra })}
      />

      <div className="max-w-[1500px] mx-auto mt-8 flex justify-end gap-4 pb-12">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={saving} className="border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-6 rounded-lg font-bold shadow-sm">
          <X size={18} className="mr-2" />
          Cancel
        </Button>
        <Button onClick={save} disabled={saving} className="bg-[#00509d] hover:bg-[#003f7a] text-white px-10 py-6 rounded-lg font-bold shadow-md gap-2 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_CSS }} />
    </div>
  )
}
