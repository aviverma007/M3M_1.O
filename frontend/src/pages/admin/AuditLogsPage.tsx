/* Audit Logs — /dashboard/audit-logs (original AuditLogsPage-CYeZdjaH) */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { downloadBlob } from '@/lib/download'
import { adminKeys, exportAuditLogs, fetchAuditLogs } from '@/api/admin'

const PAGE_SIZE = 10
const ALL = 'All Task Types'
const TASK_TYPES = [
  ALL,
  'Project Creation',
  'Project Updated',
  'Project Deleted',
  'Task Assigned',
  'Task Completed',
  'Design Brief Uploaded',
  'Design Brief Saved',
  'Record Deleted',
  'User Login',
  'Password Reset',
  'User Created',
  'User Updated',
  'User Deleted',
  'Review Comment Added',
  'Review Comment Deleted',
  'PDF Exported',
]

const TASK_BADGE: Record<string, string> = {
  'Project Creation': 'bg-green-100 text-green-700',
  'Project Updated': 'bg-emerald-100 text-emerald-700',
  'Project Deleted': 'bg-red-100 text-red-700',
  'Task Assigned': 'bg-cyan-100 text-cyan-700',
  'Task Completed': 'bg-blue-100 text-blue-700',
  'Design Brief Uploaded': 'bg-purple-100 text-purple-700',
  'Design Brief Saved': 'bg-violet-100 text-violet-700',
  'Record Deleted': 'bg-orange-100 text-orange-700',
  'User Login': 'bg-sky-100 text-sky-700',
  'Password Reset': 'bg-yellow-100 text-yellow-700',
  'User Created': 'bg-teal-100 text-teal-700',
  'User Updated': 'bg-indigo-100 text-indigo-700',
  'User Deleted': 'bg-rose-100 text-rose-700',
  'Review Comment Added': 'bg-lime-100 text-lime-700',
  'Review Comment Deleted': 'bg-amber-100 text-amber-700',
  'PDF Exported': 'bg-slate-100 text-slate-700',
}
const badgeCls = (t: string) => TASK_BADGE[t] ?? 'bg-gray-100 text-gray-700'

const formatDateTime = (v?: string) => (v ? format(new Date(v), 'yyyy-MM-dd hh:mm a') : '-')

function DateButton({ value, onChange, placeholder }: { value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'flex-1 justify-start text-left font-normal h-10 bg-white border-gray-200 shadow-sm hover:bg-gray-50',
            !value && 'text-[#707e94]',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-[#707e94]" />
          {value ? format(value, 'P') : <span className="text-sm">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onChange} autoFocus />
      </PopoverContent>
    </Popover>
  )
}

export default function AuditLogsPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [search, setSearch] = useState('')
  const [taskType, setTaskType] = useState(ALL)
  const [page, setPage] = useState(1)

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (search) f.search = search
    if (taskType !== ALL) f.type = taskType
    if (fromDate) f.fromDate = format(fromDate, 'yyyy-MM-dd')
    if (toDate) f.toDate = format(toDate, 'yyyy-MM-dd')
    return f
  }, [search, taskType, fromDate, toDate])

  const params = { page: String(page), limit: String(PAGE_SIZE), ...filters }
  const { data, isFetching } = useQuery({ queryKey: adminKeys.auditLogs(params), queryFn: () => fetchAuditLogs(params) })
  const logs = data?.logs ?? []
  const totalPages = data?.totalPages ?? 1
  const totalLogs = data?.totalLogs ?? 0
  const loading = isFetching

  const exportCsv = async () => {
    try {
      const blob = await exportAuditLogs(filters)
      downloadBlob(blob, 'audit-logs.csv', 'text/csv')
    } catch (err) {
      console.error('Error exporting CSV', err)
    }
  }

  const reset = () => {
    setFromDate(undefined)
    setToDate(undefined)
    setSearch('')
    setTaskType(ALL)
    setPage(1)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Audit Logs</h2>
            <p className="text-sm text-gray-500 mt-1">Track all activities and changes across the platform</p>
          </div>
          <Button variant="outline" onClick={exportCsv} className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="text-sm text-slate-700 font-medium mb-1.5 block px-1">Select date range</label>
            <div className="flex gap-3">
              <DateButton value={fromDate} onChange={setFromDate} placeholder="From" />
              <DateButton value={toDate} onChange={setToDate} placeholder="To" />
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="text-sm text-gray-500 mb-1 block px-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search user or task..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="text-sm text-gray-500 mb-1 block px-1">Task Type</label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="h-10 data-[size=default]:h-10">
                <SelectValue placeholder={ALL} />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button variant="ghost" className="h-10 text-gray-600" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Filter
            </Button>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white uppercase bg-[#005baa]">
              <tr>
                <th className="px-6 py-4 font-medium">S.NO</th>
                <th className="px-6 py-4 font-medium">USER</th>
                <th className="px-6 py-4 font-medium">DATE &amp; TIME</th>
                <th className="px-6 py-4 font-medium">TASK TYPE</th>
                <th className="px-6 py-4 font-medium">TASK DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-6 py-4">{log.Creator?.name || 'System'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeCls(log.taskType)}`}>{log.taskType}</span>
                    </td>
                    <td className="px-6 py-4">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Showing {logs.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, totalLogs)} of {totalLogs} Entries
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let n = i + 1
              if (totalPages > 5 && page > 3) {
                n = page - 2 + i
                if (n > totalPages) return null
              }
              return (
                <Button
                  key={n}
                  variant={page === n ? 'default' : 'outline'}
                  size="sm"
                  className={`w-8 h-8 p-0 ${page === n ? 'bg-[#50b249] hover:bg-[#409239]' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading || totalPages === 0}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
