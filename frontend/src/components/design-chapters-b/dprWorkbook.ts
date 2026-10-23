/**
 * Mock-mode DPR export: builds an .xlsx workbook (one sheet per selected module) from the
 * project's design-brief summary. In http mode the real backend renders the PDF instead.
 */
import * as XLSX from 'xlsx'
import type { DesignBriefSummary } from '@/types/chapters-b'

/** export module label -> summary key that holds its data */
const MODULE_KEY: Record<string, string> = {
  'Project Details + Layout Plans': 'projectDetailsLayoutData',
  'Unit Level Design': 'unitLevelDesignData',
  'Project Level Design': 'projectLevelDesignData',
  Structure: 'structureData',
  MEP: 'mepData',
  'ID Specifications': 'idSpecificationsData',
  'Common Area': 'commonAreaData',
  'Landscape & Amenities': 'landscapeAmenitiesData',
  'Service Design Consideration': 'serviceDesignData',
  'Contracting Strategy': 'contractingStrategyData',
  'Consultant Strategy': 'consultantStrategyData',
  'Phasing Plan': 'phasingPlanData',
  'Project Schedule': 'projectScheduleData',
  'Approvals': 'approvalsData',
  'Additional Project Details': 'additionalProjectDetailsData',
}

type Cell = string | number | boolean
type Rows = Cell[][]

const show = (v: unknown): Cell => {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'string') return v
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? ((x as { name?: string }).name ?? JSON.stringify(x)) : String(x))).join(', ')
  return JSON.stringify(v)
}
const humanize = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

/** array of flat objects -> header row + one row per object (ids dropped) */
function table(rows: Record<string, unknown>[], skip: string[] = ['id']): Rows {
  if (!rows.length) return [['No data']]
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((c) => !skip.includes(c))
  return [cols.map(humanize), ...rows.map((r) => cols.map((c) => show(r[c])))]
}

function sheetRows(module: string, s: DesignBriefSummary): Rows {
  const data = s[MODULE_KEY[module]] as unknown
  if (data === undefined || data === null) return [['No data saved for this module']]
  switch (module) {
    case 'Landscape & Amenities': {
      const d = s.landscapeAmenitiesData!
      const out: Rows = [['Category', 'Parameter', 'This Project']]
      ;(d.landscapeConfig ?? []).forEach((c) => c.parameters.forEach((p) => out.push([c.category, p.label, show(d.landscapeData?.[p.name] ?? (p.type === 'switch' ? false : ''))])))
      out.push([], ['Amenity Head', 'Amenity', 'Selected'])
      ;(d.amenitiesList ?? []).forEach((h) => h.items.forEach((i) => out.push([h.head, i, (d.selectedAmenities ?? []).includes(i) ? 'Yes' : 'No'])))
      return out
    }
    case 'Contracting Strategy': {
      const d = s.contractingStrategyData!
      const out: Rows = [['Package', 'Element', 'Type', '# of Contractors', 'Type of Contractors', 'Remarks']]
      ;(d.packages ?? []).forEach((p) =>
        p.elements.length ? p.elements.forEach((e) => out.push([p.name, e.name, e.type, e.numberOfContractors, e.typeOfContractors, e.remarks])) : out.push([p.name, '', '', '', '', '']),
      )
      out.push([], ['Grade', 'Contractor Name', 'Benchmark Projects', 'Previous M3M Projects', 'Remarks'])
      ;(d.contractors ?? []).forEach((c) => out.push([c.grade, c.name, c.benchmark, c.previous, c.remarks]))
      return out
    }
    case 'Project Schedule': {
      const d = s.projectScheduleData!
      const out: Rows = [['Master Schedule', 'Sub-schedule', 'Duration (Days)', 'Start', 'Finish']]
      ;(d.schedules ?? []).forEach((m) => {
        out.push([m.task, '', m.duration, m.start, m.finish])
        ;(m.subTasks ?? []).forEach((t) => out.push(['', t.task, t.duration, t.start, t.finish]))
      })
      out.push([], ['Section', 'Start Date (PCC)', 'No. Of Days', 'Finish Date', 'Project Duration (Months)', 'Structure Works (Months)'])
      ;(d.sections ?? []).forEach((x) => out.push([x.name, x.start, show(x.days), x.finish, x.durationMonths, x.structureMonths]))
      return out
    }
    default:
      if (Array.isArray(data)) return table(data as Record<string, unknown>[])
      if (typeof data === 'object') return [['Parameter', 'Value'], ...Object.entries(data as Record<string, unknown>).map(([k, v]) => [humanize(k), show(v)])]
      return [[show(data)]]
  }
}

export function buildDprWorkbook(projectId: string | number, modules: string[], summary: DesignBriefSummary | null): Blob {
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()
  modules.forEach((m) => {
    // sheet names: max 31 chars, no []:*?/\
    let name = m.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)
    while (used.has(name)) name = name.slice(0, 29) + '_' + used.size
    used.add(name)
    const rows: Rows = [[`DPR Report - Project ${projectId}`], [m], [], ...sheetRows(m, summary ?? {})]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  })
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
