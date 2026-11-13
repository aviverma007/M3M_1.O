/*
 * Money entered in the PMO modules (all amounts in Rs.):
 *   Consultant Strategy — order value (fee) per appointed consultant; output Rs. per sq ft of BUA (fee ÷ Module 6 Built Up Area)
 *   Contracting Strategy — budget per package element; package totals and grand total (also Rs. per sq ft of BUA)
 */
const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}
const str = (v: unknown) => String(v ?? '').trim()

export const isAppointed = (status: unknown) => /^appointed$/i.test(str(status))

/** "4,50,00,000" (Indian grouping, no decimals) */
export const rupees = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '-' : Math.round(v).toLocaleString('en-IN'))
/** short form: "4.5 Cr", "12.4 L", "85,000" */
export function rupeesShort(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-'
  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`
  return Math.round(v).toLocaleString('en-IN')
}

export const buaOf = (summary: Record<string, unknown> | null | undefined) =>
  n((((summary?.projectLevelDesignData ?? {}) as { keyRatioInputs?: Record<string, unknown> }).keyRatioInputs ?? {}).builtUpArea)

export type FeeLine = { type: string; name: string; appointed: boolean; fee: number | null; perSqft: number | null }
export type ConsultantFees = { lines: FeeLine[]; total: number | null; perSqft: number | null; bua: number | null }

/** fee per consultant line (only appointed lines count) and Rs./sq ft of BUA */
export function consultantFees(summary: Record<string, unknown> | null | undefined, rowsOverride?: unknown[]): ConsultantFees {
  const bua = buaOf(summary)
  const rows = (rowsOverride ?? (Array.isArray(summary?.consultantStrategyData) ? summary!.consultantStrategyData : [])) as Record<string, unknown>[]
  const lines = rows.map((r): FeeLine => {
    const appointed = isAppointed(r.status)
    const fee = appointed ? n(r.fee) : null
    return { type: str(r.type), name: str(r.name), appointed, fee, perSqft: fee !== null && bua ? fee / bua : null }
  })
  const fees = lines.map((l) => l.fee).filter((x): x is number => x !== null)
  const total = fees.length ? fees.reduce((a, b) => a + b, 0) : null
  return { lines, total, perSqft: total !== null && bua ? total / bua : null, bua }
}

export type PackageBudget = { name: string; elements: { name: string; budget: number | null }[]; total: number | null; perSqft: number | null }
export type ContractBudgets = { packages: PackageBudget[]; total: number | null; perSqft: number | null; bua: number | null }

const PLACEHOLDER = /^Element \d+$/i
export function contractBudgets(summary: Record<string, unknown> | null | undefined, packagesOverride?: unknown[]): ContractBudgets {
  const bua = buaOf(summary)
  const cs = (summary?.contractingStrategyData ?? {}) as { packages?: unknown[] }
  const pkgs = (packagesOverride ?? cs.packages ?? []) as { name?: string; elements?: { name?: string; budget?: string }[] }[]
  const packages = pkgs.map((p): PackageBudget => {
    const elements = (p.elements ?? []).filter((e) => str(e.name) && !PLACEHOLDER.test(str(e.name))).map((e) => ({ name: str(e.name), budget: n(e.budget) }))
    const b = elements.map((e) => e.budget).filter((x): x is number => x !== null)
    const total = b.length ? b.reduce((a, c) => a + c, 0) : null
    return { name: str(p.name), elements, total, perSqft: total !== null && bua ? total / bua : null }
  })
  const t = packages.map((p) => p.total).filter((x): x is number => x !== null)
  const total = t.length ? t.reduce((a, c) => a + c, 0) : null
  return { packages, total, perSqft: total !== null && bua ? total / bua : null, bua }
}
