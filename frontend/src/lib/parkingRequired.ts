/* "Parking Required" (Module 6): ECS per unit x number of units (from Module 5) = ECS per type, and the grand total.
   Shared by the Project Level Design page and the DPR export. */
type Req = { label?: unknown; value?: unknown }
type UnitLike = { type?: unknown; count?: unknown }
type GroupLike = { type?: unknown; units?: UnitLike[] | unknown }

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : NaN
}
const key = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Module 5 unit types with their unit counts (all groups, in table order) */
export function module5Units(rows: GroupLike[] | unknown) {
  const out: { label: string; units: number }[] = []
  for (const g of Array.isArray(rows) ? (rows as GroupLike[]) : []) {
    for (const u of Array.isArray(g?.units) ? (g.units as UnitLike[]) : []) {
      const label = String(u?.type ?? '').trim()
      if (label) out.push({ label, units: Number.isFinite(n(u.count)) ? n(u.count) : 0 })
    }
  }
  return out
}

/** number of units for a parking row: Module 5 unit type with the same name (exact, else one name containing the other) */
export function unitsFor(label: unknown, units: { label: string; units: number }[]) {
  const k = key(label)
  if (!k) return null
  const exact = units.find((u) => key(u.label) === k)
  if (exact) return exact.units
  const loose = units.filter((u) => key(u.label).includes(k) || k.includes(key(u.label)))
  return loose.length === 1 ? loose[0].units : null
}

const r2 = (x: number) => Math.round(x * 100) / 100
export const fmtNum = (x: number) => String(r2(x))

/** rows with ECS per unit, units and total; only rows with an ECS value */
export function parkingRequired(reqs: Req[] | unknown, module5Rows: GroupLike[] | unknown) {
  const units = module5Units(module5Rows)
  // unit types can repeat in Module 5 (same name, different counts): pair rows with entries one-to-one, in order
  const used = new Set<number>()
  const take = (label: unknown) => {
    const k = key(label)
    const i = units.findIndex((u, j) => !used.has(j) && key(u.label) === k)
    if (i >= 0) {
      used.add(i)
      return units[i].units
    }
    return unitsFor(label, units)
  }
  const rows = (Array.isArray(reqs) ? (reqs as Req[]) : [])
    .map((r) => {
      const ecs = n(r?.value)
      const u = take(r?.label)
      return { label: String(r?.label ?? '').trim(), ecs: Number.isFinite(ecs) ? ecs : null, units: u, total: Number.isFinite(ecs) && u !== null ? r2(ecs * u) : null }
    })
    .filter((r) => r.label && r.ecs !== null)
  const total = r2(rows.reduce((s, r) => s + (r.total ?? 0), 0))
  return { rows, total }
}
