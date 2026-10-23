import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircleCheck, Download, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/common/PageLoader'
import { BackLink } from '@/components/design-chapters-b/PageChrome'
import { exportDpr, useSummaryLoader } from '@/api/chapters-b'
import { API_MODE } from '@/api/http'
import { buildDprWorkbook } from '@/components/design-chapters-b/dprWorkbook'
import type { DesignBriefSummary } from '@/types/chapters-b'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'

/** Modules selectable for the DPR export (same ids/labels as the original). */
const EXPORT_MODULES = [
  'Project Details + Layout Plans',
  'Unit Level Design',
  'Project Level Design',
  'Structure',
  'MEP',
  'ID Specifications',
  'Common Area',
  'Landscape & Amenities',
  'Service Design Consideration',
  'Contracting Strategy',
  'Consultant Strategy',
  'Phasing Plan',
  'Project Schedule',
  'Approvals',
  'Additional Project Details',
]

type Row = { id: string; module: string; checked: boolean }
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export default function ExportConfigurationForm() {
  const { projectId } = useParams()
  const [exporting, setExporting] = useState(false)
  const [rows, setRows] = useState<Row[]>(EXPORT_MODULES.map((m, i) => ({ id: `m_${i + 1}`, module: m, checked: false })))
  const [summary, setSummary] = useState<DesignBriefSummary | null>(null)
  // the original loads the summary before rendering; in mock mode it is also the export's content
  const loading = useSummaryLoader(projectId, setSummary, { label: 'project data for export' })

  const toggle = (id: string) => setRows((r) => r.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)))
  const setAll = (checked: boolean) => setRows((r) => r.map((x) => ({ ...x, checked })))
  const allChecked = rows.every((r) => r.checked)

  const exportReport = async () => {
    const selected = rows.filter((r) => r.checked).map((r) => r.module)
    if (selected.length === 0) {
      toast.error('Please select at least one module to export.')
      return
    }
    setExporting(true)
    try {
      const blob = await exportDpr(projectId!, selected)
      if (API_MODE === 'mock') {
        // no server-side renderer offline: download an XLSX with one sheet per selected module instead of the PDF
        downloadBlob(buildDprWorkbook(projectId!, selected, summary), `Project_DPR_Report_${projectId}.xlsx`, XLSX_MIME)
      } else downloadBlob(blob, `Project_DPR_Report_${projectId}.pdf`)
      toast.success('DPR report exported successfully as PDF!')
    } catch (e) {
      console.error('Export error:', e)
      toast.error('An error occurred during PDF export.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-[1400px] mx-auto mb-6">
        <BackLink label="Export Configuration" className="font-semibold" />
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Export Configuration</h1>
            <p className="text-sm text-gray-500 mt-1">Configure unit-level parameters and view efficiency calculations</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="max-w-xs space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Report Type</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg h-10 flex items-center px-3 font-semibold text-gray-800 text-sm">DPR</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#00509d] text-white uppercase text-[11px] font-black tracking-widest">
                <th className="px-6 py-4 text-left w-[80%] border-r border-white/10">Module Name</th>
                <th className="px-6 py-4 text-center w-[20%]">
                  <div className="flex items-center justify-center gap-2 cursor-pointer select-none" onClick={() => setAll(!(rows.length > 0 && allChecked))}>
                    <span>Include in Export</span>
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-all',
                        allChecked ? 'bg-white border-white' : 'border-white/50 hover:border-white',
                      )}
                    >
                      {allChecked && <CircleCheck size={12} className="text-[#00509d]" />}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggle(s.id)}>
                  <td className="px-6 py-5 align-middle border-r border-gray-100">
                    <span className="font-bold text-gray-800 text-sm leading-tight">{s.module}</span>
                  </td>
                  <td className="px-6 py-5 align-middle">
                    <div className="flex justify-center">
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
                          s.checked ? 'bg-[#4caf50] border-[#4caf50] shadow-sm' : 'border-gray-200',
                        )}
                      >
                        {s.checked && <CircleCheck size={14} className="text-white" />}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pb-10">
          <Button
            onClick={() => toast.success('Export configuration saved successfully!')}
            variant="outline"
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 h-11 px-8 font-bold shadow-sm rounded-lg"
          >
            Save Configuration
          </Button>
          <Button
            onClick={exportReport}
            disabled={exporting}
            className="bg-[#00509d] hover:bg-[#003f7a] text-white h-11 px-8 font-bold shadow-md rounded-lg gap-2 border-none min-w-[200px]"
          >
            {exporting ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
            {exporting ? 'Generating...' : 'Export / Generate Report'}
          </Button>
        </div>
      </div>
    </div>
  )
}
