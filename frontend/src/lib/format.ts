/*
 * One rule for numbers across the owner-facing screens and PDFs:
 * Indian digit grouping (31,79,765.02), at most 2 decimals, money in crore ("Rs. 4,512.3 Cr"), areas in sq ft.
 */
export function fmtIN(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-'
  return n.toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: 0 })
}

/** rupees -> "Rs. 4,512.35 Cr" (input in rupees) */
export function fmtCr(rupees: number | null | undefined, dp = 2) {
  if (rupees === null || rupees === undefined || !Number.isFinite(rupees)) return '-'
  return `Rs. ${fmtIN(rupees / 1e7, dp)} Cr`
}

/** big areas as lakh sq ft ("31.80 lakh sq ft"); small ones in full */
export function fmtArea(sqft: number | null | undefined) {
  if (sqft === null || sqft === undefined || !Number.isFinite(sqft)) return '-'
  return sqft >= 1e5 ? `${fmtIN(sqft / 1e5, 2)} lakh sq ft` : `${fmtIN(sqft, 0)} sq ft`
}

export const fmtPct = (v: number | null | undefined, dp = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '-' : `${fmtIN(v, dp)}%`)
