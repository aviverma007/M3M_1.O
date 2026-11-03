/* Module 5 unit table: residential subtotal (shared by the Project Details page, Project Level Design and the DPR export). */
type UnitLike = { count?: unknown; size?: unknown; area?: unknown; type?: unknown }
type GroupLike = { type?: unknown; units?: UnitLike[] | unknown; total?: unknown }

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : 0
}

/** a group counts as residential when its Type name says so ("Residential", "Residential - Phase 1", …) */
export const isResidentialGroup = (g: GroupLike) => /resid/i.test(String(g?.type ?? ''))

/** total units and total saleable area (sq ft) of one group */
export function groupTotals(g: GroupLike) {
  const units = Array.isArray(g?.units) ? (g.units as UnitLike[]) : []
  const count = units.reduce((s, u) => s + n(u.count), 0)
  const area = units.reduce((s, u) => s + (n(u.area) || n(u.count) * n(u.size)), 0)
  return { units: count, area: Math.round(area * 1000) / 1000 }
}

/** totals of all residential groups — this is what Module 6 uses as its Saleable Area */
export function residentialTotals(rows: GroupLike[] | unknown) {
  const list = Array.isArray(rows) ? (rows as GroupLike[]) : []
  return list.filter(isResidentialGroup).reduce<{ units: number; area: number }>(
    (t, g) => {
      const x = groupTotals(g)
      return { units: t.units + x.units, area: Math.round((t.area + x.area) * 1000) / 1000 }
    },
    { units: 0, area: 0 },
  )
}
