/*
 * Module 13 services sizing outputs (shared by the Service Design form, the DPR and the Comparison).
 *
 *   kVA per unit         = total connected load ÷ units (or the entered load per unit)
 *   Transformer loading  = connected load ÷ installed transformer capacity
 *   Daily water demand   = LPCD × 5 persons per unit × units ÷ 1000   (KLD)
 *   Water storage        = (UG + OH tank) ÷ daily demand                (days)
 *   Solar share          = solar kWp ÷ connected load
 *   EV charging points   = EV % × car parks
 */
const n = (v: unknown) => {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : null
}

export const PERSONS_PER_UNIT = 5

export type ServicesContext = { units: number | null; cars: number | null }
export type ServicesOutputs = {
  kvaPerUnit: number | null
  totalLoad: number | null
  transformerKva: number | null
  transformerLoading: number | null
  dgUnits: number | null
  dgCommon: number | null
  dailyDemandKld: number | null
  storageDays: number | null
  recycledPct: number | null
  solarSharePct: number | null
  evPoints: number | null
  evPct: number | null
}

export function servicesOutputs(sd: Record<string, unknown> | null | undefined, c: ServicesContext): ServicesOutputs {
  const d = sd ?? {}
  const perUnit = n(d.loadPerUnit)
  const total = n(d.totalConnectedLoad) ?? (perUnit !== null && c.units ? perUnit * c.units : null)
  const kvaPerUnit = n(d.totalConnectedLoad) !== null && c.units ? n(d.totalConnectedLoad)! / c.units : perUnit
  const tr = n(d.transformers)
  const trCap = n(d.transformerCapacity)
  const transformerKva = tr && trCap ? tr * trCap : null
  const lpcd = n(d.waterDemandLpcd)
  const dailyDemandKld = lpcd && c.units ? (lpcd * PERSONS_PER_UNIT * c.units) / 1000 : null
  const tanks = (n(d.ugTankCapacity) ?? 0) + (n(d.ohTankCapacity) ?? 0)
  const solar = n(d.solarPvKwp)
  const evPct = n(d.evChargerPct)
  return {
    kvaPerUnit,
    totalLoad: total,
    transformerKva,
    transformerLoading: total && transformerKva ? (total / transformerKva) * 100 : null,
    dgUnits: n(d.dgBackupUnits),
    dgCommon: n(d.dgBackupCommon),
    dailyDemandKld,
    storageDays: tanks > 0 && dailyDemandKld ? tanks / dailyDemandKld : null,
    recycledPct: n(d.recycledWaterPct),
    solarSharePct: solar !== null && total ? (solar / total) * 100 : null,
    evPoints: evPct !== null && c.cars ? Math.round((evPct / 100) * c.cars) : null,
    evPct,
  }
}

/** Module 6 units / car parks for a project's saved summary */
export function servicesContextOf(summary: Record<string, unknown> | null | undefined): ServicesContext {
  const kr = ((summary?.projectLevelDesignData ?? {}) as { keyRatioInputs?: Record<string, unknown> }).keyRatioInputs ?? {}
  return { units: n(kr.noOfUnits), cars: n(kr.totalNumberOfCars) }
}

/** label, value, unit, decimals, note — one list for the form panel and the DPR */
export function servicesOutputRows(o: ServicesOutputs): { label: string; value: number | null; unit: string; dp: number; note?: string }[] {
  return [
    { label: 'Connected Load per Unit', value: o.kvaPerUnit, unit: 'kVA', dp: 2 },
    { label: 'Total Connected Load', value: o.totalLoad, unit: 'kVA', dp: 0 },
    { label: 'Transformer Loading', value: o.transformerLoading, unit: '%', dp: 0, note: o.transformerKva ? `of ${o.transformerKva.toLocaleString('en-IN')} kVA installed` : undefined },
    { label: 'DG Backup — Units', value: o.dgUnits, unit: '%', dp: 0 },
    { label: 'DG Backup — Common Areas', value: o.dgCommon, unit: '%', dp: 0 },
    { label: 'Daily Water Demand', value: o.dailyDemandKld, unit: 'KLD', dp: 0, note: `at ${PERSONS_PER_UNIT} persons per unit` },
    { label: 'Water Storage', value: o.storageDays, unit: 'days', dp: 1, note: 'UG + OH tanks ÷ daily demand' },
    { label: 'Water Recycled', value: o.recycledPct, unit: '%', dp: 0 },
    { label: 'Solar Share', value: o.solarSharePct, unit: '% of load', dp: 1 },
    { label: 'EV Charging Points', value: o.evPoints, unit: 'nos', dp: 0, note: o.evPct !== null ? `${o.evPct}% of car parks` : undefined },
  ]
}
