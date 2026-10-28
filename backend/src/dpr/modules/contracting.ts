import { emptyMessage } from '../doc.js'
import type { ModuleRenderer } from './index.js'
import { filled, flowTable, pager, val, type Col } from './cs-table.js'

type Contractor = { name?: string; grade?: string; benchmark?: string; previous?: string; remarks?: string }
type Element = { name?: string; type?: string; numberOfContractors?: string; typeOfContractors?: string; remarks?: string }
type Pkg = { name?: string; elements?: Element[] }

const CONTRACTOR_COLS: Col[] = [
  { label: 'Contractor', width: 170 },
  { label: 'Grade', width: 90 },
  { label: 'Benchmark Projects', width: 230 },
  { label: 'Previous Work with Us', width: 120 },
  { label: 'Remarks', width: 120 },
]
const ELEMENT_COLS: Col[] = [
  { label: 'Element', width: 200 },
  { label: 'Type', width: 130 },
  { label: 'No. of Contractors', width: 130 },
  { label: 'Type of Contractors', width: 130 },
  { label: 'Remarks', width: 140 },
]
const PLACEHOLDER = /^Element \d+$/i

const contracting: ModuleRenderer = (ctx, input) => {
  const page = pager(ctx, 'Contracting Strategy')
  const d = input.summary?.contractingStrategyData as { contractors?: Contractor[]; packages?: Pkg[] } | undefined
  const contractors = (d?.contractors ?? []).filter((c) => filled(c.name, c.benchmark, c.previous, c.remarks))
  const packages = (d?.packages ?? [])
    .map((p) => ({ ...p, elements: (p.elements ?? []).filter((e) => e.name && !PLACEHOLDER.test(e.name.trim())) }))
    .filter((p) => p.elements.length)
  let y = page()
  if (!contractors.length && !packages.length) return emptyMessage(ctx, 'No contracting strategy configured.')
  y = flowTable(
    ctx,
    'Contractor Repository',
    CONTRACTOR_COLS,
    contractors.map((c) => [val(c.name), val(c.grade), val(c.benchmark), val(c.previous), val(c.remarks)]),
    y,
    page,
  )
  for (const p of packages)
    y = flowTable(
      ctx,
      val(p.name),
      ELEMENT_COLS,
      p.elements.map((e) => [val(e.name), val(e.type), val(e.numberOfContractors), val(e.typeOfContractors), val(e.remarks)]),
      y,
      page,
    )
}
export default contracting
