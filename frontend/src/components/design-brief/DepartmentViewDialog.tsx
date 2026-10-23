/* Read-only department inputs viewer used on "All Design Input" (original AllDesignBrief dialog). */
import { ChevronDown, Download, Eye, FileText, X } from 'lucide-react'
import { primaryRecord } from '@/api/design-brief'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/overlays'
import type { DesignBriefData, DeptKey } from '@/types/design-brief'
import FileLink from './FileLink'
import { SUMMARY_CATALOGUE } from './fields'

type SummaryKey = keyof typeof SUMMARY_CATALOGUE
type Row = { key: string; label: string; type?: string; val: unknown; note: unknown; cadNote: unknown; pdfNote: unknown }
type FileItem = { name: string; s3Url: string }

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const isUrl = (v: unknown): v is string => typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/'))

type Props = {
  active: SummaryKey | null
  onSelect: (k: SummaryKey | null) => void
  data: DesignBriefData | null
  projectName?: string
  onDownload: (k: DeptKey) => void
}

export default function DepartmentViewDialog({ active, onSelect, data, projectName, onDownload }: Props) {
  const rec = active ? primaryRecord(data?.[active]) : null

  const rows = (): Row[] => {
    if (!active) return []
    const r = rec as Record<string, unknown> | null
    const list: Row[] = SUMMARY_CATALOGUE[active].fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      val: r?.[f.key] ?? r?.[snake(f.key)],
      note: r?.[`${f.key}Note`] ?? r?.[`${snake(f.key)}_note`],
      cadNote: r?.[`${f.key}CADNote`],
      pdfNote: r?.[`${f.key}PDFNote`],
    }))
    if (rec?.customFields)
      Object.keys(rec.customFields)
        .filter((k) => !k.endsWith('Note'))
        .forEach((k) => list.push({ key: k, label: k, type: 'text', val: rec.customFields![k], note: rec.customFields![`${k}Note`], cadNote: null, pdfNote: null }))
    return list
  }

  const filePair = (label: string, href: string) => (
    <div className="p-2 bg-blue-50 rounded border border-blue-100 space-y-1">
      <div className="text-[9px] text-blue-600 uppercase">{label}</div>
      <div className="flex gap-2">
        <FileLink href={href} mode="view" className="text-[#0f5ebb] hover:text-blue-800">
          <Eye className="w-4 h-4" />
        </FileLink>
        <FileLink href={href} mode="download" className="text-[#0f5ebb] hover:text-blue-800">
          <Download className="w-4 h-4" />
        </FileLink>
      </div>
    </div>
  )

  const attachment = (a: Row) => {
    if (a.type === 'file_list' && Array.isArray(a.val) && a.val.length > 0)
      return (
        <div className="flex flex-col gap-3">
          {(a.val as FileItem[]).map((f, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[10px] text-gray-500 font-bold truncate max-w-[150px]">{f.name}</span>
              <div className="flex gap-2">
                <FileLink
                  href={f.s3Url}
                  mode="view"
                  className="flex items-center gap-1.5 text-[#0f5ebb] hover:text-blue-800 transition-colors bg-white px-2 py-1 rounded border border-blue-50 shadow-sm text-[10px] font-black"
                >
                  <Eye className="w-3 h-3" /> VIEW
                </FileLink>
                <FileLink
                  href={f.s3Url}
                  mode="download"
                  className="flex items-center gap-1.5 text-[#0f5ebb] hover:text-blue-800 transition-colors bg-white px-2 py-1 rounded border border-blue-50 shadow-sm text-[10px] font-black"
                >
                  <Download className="w-3 h-3" /> DOWNLOAD
                </FileLink>
              </div>
            </div>
          ))}
        </div>
      )
    if (a.cadNote || a.pdfNote || a.note)
      return (
        <div className="flex flex-col gap-2 font-black text-xs">
          {!!a.cadNote && filePair('CAD File', String(a.cadNote))}
          {!!a.pdfNote && filePair('PDF File', String(a.pdfNote))}
          {!!a.note &&
            !a.cadNote &&
            !a.pdfNote &&
            (isUrl(a.note) ? (
              <div className="flex flex-col gap-1">
                <FileLink href={a.note} mode="view" className="flex items-center gap-2 text-[#0f5ebb] hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <Eye className="w-4 h-4" /> VIEW
                </FileLink>
                <FileLink href={a.note} mode="download" className="flex items-center gap-2 text-[#0f5ebb] hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <Download className="w-4 h-4" /> DOWNLOAD
                </FileLink>
              </div>
            ) : (
              <span className="text-gray-600 font-medium whitespace-pre-wrap">{String(a.note)}</span>
            ))}
        </div>
      )
    return <span className="text-gray-200 font-bold">-</span>
  }

  return (
    <Dialog open={!!active} onOpenChange={() => onSelect(null)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] w-full sm:max-w-[1240px] max-h-[95vh] h-[800px] p-0 overflow-hidden border-none shadow-2xl bg-white"
      >
        <DialogTitle className="sr-only">{active ? SUMMARY_CATALOGUE[active].label : 'Department'}</DialogTitle>
        {active && (
          <div className="flex flex-col h-full bg-white relative">
            <button onClick={() => onSelect(null)} className="absolute right-6 top-6 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
            <div className="shrink-0 flex items-center justify-between px-10 py-7 border-b bg-white">
              <div className="space-y-1.5">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{projectName || 'Project Details'}</h2>
                <div className="flex items-center gap-2.5 text-sm text-gray-500 font-semibold">
                  <span>Project: Design Brief</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span>Residential Property</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span>Last Update: {rec?.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('en-GB') : '15/01/2024'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mr-10">
                <Button
                  onClick={() => onDownload(active)}
                  className="bg-[#0f5ebb] hover:bg-[#0f5ebb]/90 text-white gap-2 h-11 px-7 rounded-lg shadow-md font-bold transition-all hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  Download input PDF
                </Button>
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden min-h-0 w-full">
              <div className="w-72 shrink-0 border-r bg-[#F8FAFC] relative min-h-0">
                <div className="absolute inset-0 flex flex-col py-6 overflow-y-auto">
                  <div className="px-8 mb-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departments</h4>
                  </div>
                  {(Object.keys(SUMMARY_CATALOGUE) as SummaryKey[]).map((k) => {
                    const isActive = active === k
                    const has = (data?.[k]?.length ?? 0) > 0
                    return (
                      <button
                        key={k}
                        onClick={() => onSelect(k)}
                        className={`flex items-center gap-4 px-8 py-4.5 text-sm font-bold transition-all relative group ${isActive ? 'text-[#0f5ebb] bg-white border-r-4 border-r-[#0f5ebb] shadow-[0_1px_3px_rgba(0,0,0,0.05)]' : 'text-gray-400 hover:text-gray-900 hover:bg-white/50'}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${has ? 'bg-[#10B981]' : 'bg-gray-300'}`} />
                        {SUMMARY_CATALOGUE[k].label}
                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0f5ebb]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex-1 relative min-w-0">
                <div className="absolute inset-0 p-10 overflow-y-auto bg-white border-l shadow-inner">
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-[#0f5ebb]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{SUMMARY_CATALOGUE[active].label}</h3>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-all">
                      <ChevronDown className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
                    <table className="w-full text-sm border-collapse table-auto">
                      <thead className="bg-[#F8FAFC] text-gray-400 uppercase text-[11px] tracking-widest font-black border-b border-gray-100">
                        <tr>
                          <th className="px-8 py-5 text-left w-20">Sl No</th>
                          <th className="px-8 py-5 text-left">Item Description</th>
                          <th className="px-8 py-5 text-left w-40">Input Type</th>
                          <th className="px-8 py-5 text-left min-w-[300px]">Submitted Value</th>
                          <th className="px-8 py-5 text-left w-52">Attachment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows().map((a, i) => (
                          <tr key={a.key} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="px-8 py-6 font-bold text-gray-300 align-top text-xs">{String(i + 1).padStart(2, '0')}</td>
                            <td className="px-8 py-6 font-extrabold text-[#1E293B] align-top text-base tracking-tight leading-tight">{a.label}</td>
                            <td className="px-8 py-6 text-gray-400 font-bold align-top text-xs uppercase tracking-wider">
                              {a.type === 'file_list' ? 'Files' : rec && typeof a.val === 'number' ? 'Numeric' : 'Text'}
                            </td>
                            <td className="px-8 py-6 align-top">
                              <div className="text-[#0f5ebb] font-black whitespace-pre-wrap leading-relaxed min-w-[280px] text-lg tracking-tight">
                                {a.type === 'file_list' ? (Array.isArray(a.val) ? (a.val as FileItem[]).map((f) => f.name).join(', ') : '-') : String(a.val || '') || '-'}
                              </div>
                            </td>
                            <td className="px-8 py-6 align-top">{attachment(a)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-12 pt-8 flex flex-col items-center gap-5 border-t border-dashed border-gray-100">
                    <p className="text-sm text-gray-400 font-bold italic tracking-tight">This is a read-only governance summary view.</p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => onSelect(null)}
                        className="px-10 py-3 rounded-full border-2 border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-700 hover:border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                      >
                        CLOSE VIEW
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-200 font-black uppercase tracking-[0.2em]">© 2024 DEPT GOVERNANCE GATEWAY • ALL RIGHTS RESERVED</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
