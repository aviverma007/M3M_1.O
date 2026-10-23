import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/common/PageLoader'
import { BackLink } from '@/components/design-chapters-b/PageChrome'
import PackagesBoard from '@/components/design-chapters-b/PackagesBoard'
import ContractorRepository from '@/components/design-chapters-b/ContractorRepository'
import { errorMessage, saveSummary, useSummaryLoader } from '@/api/chapters-b'
import type { ContractPackage, Contractor } from '@/types/chapters-b'

const DEFAULT_ELEMENTS = ['Facade', 'Fire Fighting', 'Lift & Escalator', 'HVAC', 'Structure']

/** Default repository rows (as hardcoded in the original page). */
const DEFAULT_CONTRACTORS: Contractor[] = [
  { id: 1, name: 'NCCCL INDIA', grade: 'Grade A', benchmark: 'Prestige White Meadows (T-3 & 4); ACME Ozone, Thane', previous: '', remarks: '' },
  { id: 2, name: 'NCC', grade: 'Grade A', benchmark: 'EMAAR, Sec-62, Gurgaon; Conscient', previous: '', remarks: '' },
  { id: 3, name: 'KEC', grade: 'Grade A', benchmark: 'Godrej Aristocrat', previous: '', remarks: '' },
  { id: 4, name: 'NCCCL INDIA', grade: 'Grade B', benchmark: 'Prestige White Meadows (T-3 & 4); ACME Ozone, Thane', previous: '', remarks: '' },
  { id: 5, name: 'NCC', grade: 'Grade B', benchmark: 'EMAAR, Sec-62, Gurgaon; Conscient', previous: '', remarks: '' },
  { id: 6, name: 'KEC', grade: 'Grade B', benchmark: 'Godrej Aristocrat', previous: '', remarks: '' },
]

const PLACEHOLDER_ELEMENT = /^Element \d+$/i

export default function ContractingStrategyForm() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [contractors, setContractors] = useState<Contractor[]>(DEFAULT_CONTRACTORS)
  const [elements, setElements] = useState<string[]>([...DEFAULT_ELEMENTS])
  const [packages, setPackages] = useState<ContractPackage[]>([{ id: 1, name: 'Package 1', elements: [] }])

  const loading = useSummaryLoader(
    projectId,
    (s) => {
      const d = s?.contractingStrategyData
      if (!d) {
        setElements([...DEFAULT_ELEMENTS])
        return
      }
      if (d.contractors) setContractors(d.contractors)
      if (d.packages)
        setPackages(d.packages.map((p) => ({ ...p, elements: (p.elements || []).filter((l) => l.name && !PLACEHOLDER_ELEMENT.test(l.name.trim())) })))
      if (d.availableElements) setElements(d.availableElements.filter((i) => typeof i === 'string' && !PLACEHOLDER_ELEMENT.test(i.trim())))
    },
    { delay: 500, label: 'contracting strategy data', onError: () => setElements([...DEFAULT_ELEMENTS]) },
  )

  const save = async () => {
    setSaving(true)
    try {
      await saveSummary(projectId!, { contractingStrategyData: { contractors, packages, availableElements: elements } })
      toast.success('Contracting Strategy saved successfully!')
      navigate(-1)
    } catch (e) {
      console.error('Error saving contracting strategy:', e)
      toast.error(errorMessage(e, 'Failed to save contracting strategy'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-6">
      <div className="max-w-[1500px] mx-auto mb-6">
        <BackLink label="Contracting Strategy & Repository" animated={false} />
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Contracting Strategy</h1>
        <PackagesBoard elements={elements} setElements={setElements} packages={packages} setPackages={setPackages} />
      </div>
      <ContractorRepository contractors={contractors} onChange={setContractors} />
      <div className="max-w-[1500px] mx-auto mt-8 flex justify-end gap-4 pb-12">
        <Button onClick={save} disabled={saving} className="bg-[#00509d] hover:bg-[#003f7a] text-white px-10 py-6 rounded-lg font-bold shadow-md gap-2">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
    </div>
  )
}
